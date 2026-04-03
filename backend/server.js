const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

require('./database'); // must come before any model require

const User     = require('./models/User');
const Request  = require('./models/Request');
const Donation = require('./models/Donation');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'medidonate_secret_key_2024';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ─── Auth Middleware ──────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

// ─── REGISTER ────────────────────────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, role, city } = req.body;
    if (!name || !email || !password || !role || !city)
      return res.json({ success: false, message: 'All fields are required' });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.json({ success: false, message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: email.toLowerCase(), password: hashed, role, city });

    // FIX 1: stringify ObjectId — raw ObjectId inside JWT causes comparison bugs
    const token = jwt.sign({ id: user._id.toString(), role: user.role, email: user.email }, JWT_SECRET);

    res.json({ success: true, message: 'Registered successfully', token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, city: user.city } });
  } catch (err) {
    console.error('Register error:', err);
    res.json({ success: false, message: 'Registration failed: ' + err.message });
  }
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.json({ success: false, message: 'Email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.json({ success: false, message: 'No account found with this email' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ success: false, message: 'Incorrect password' });

    // FIX 1: stringify ObjectId
    const token = jwt.sign({ id: user._id.toString(), role: user.role, email: user.email }, JWT_SECRET);

    res.json({ success: true, token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, city: user.city } });
  } catch (err) {
    console.error('Login error:', err);
    res.json({ success: false, message: 'Login failed: ' + err.message });
  }
});

// ─── CREATE REQUEST (NGO only) ────────────────────────────────────────────────
app.post('/api/request', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'ngo')
      return res.json({ success: false, message: 'Only NGOs can post requests' });

    const { medicine_name, quantity, city, urgency } = req.body;
    if (!medicine_name || !quantity || !city || !urgency)
      return res.json({ success: false, message: 'All request fields are required' });

    const newRequest = await Request.create({
      medicine_name, quantity: Number(quantity), city, urgency,
      ngo_id: req.user.id  // string from JWT; Mongoose casts to ObjectId automatically
    });

    res.json({ success: true, request: newRequest });
  } catch (err) {
    console.error('Create request error:', err);
    res.json({ success: false, message: err.message });
  }
});

// ─── GET ALL REQUESTS ─────────────────────────────────────────────────────────
app.get('/api/requests', authMiddleware, async (req, res) => {
  try {
    const requests = await Request.find().populate('ngo_id', 'name city').sort({ createdAt: -1 });

    const formatted = requests.map(r => ({
      _id: r._id,
      medicine_name: r.medicine_name,
      quantity: r.quantity,
      city: r.city,
      urgency: r.urgency,
      status: r.status,
      createdAt: r.createdAt,
      // FIX 2: Send ngo_id as plain string so app.js === comparison works
      ngo_id: r.ngo_id?._id?.toString(),
      ngo_name: r.ngo_id?.name,
      ngo_city: r.ngo_id?.city
    }));

    res.json({ success: true, requests: formatted });
  } catch (err) {
    console.error('Get requests error:', err);
    res.json({ success: false, message: err.message });
  }
});

// ─── SUBMIT DONATION (Donor only) ─────────────────────────────────────────────
app.post('/api/donate', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'donor')
      return res.json({ success: false, message: 'Only donors can submit donations' });

    const { request_id, medicine_name, quantity, expiry_date, condition, note } = req.body;
    if (!request_id || !medicine_name || !quantity)
      return res.json({ success: false, message: 'Request ID, medicine name and quantity are required' });

    // FIX 3: Verify request_id actually exists in DB before creating donation
    const parentRequest = await Request.findById(request_id);
    if (!parentRequest)
      return res.json({ success: false, message: 'Invalid request — not found in database' });

    const donation = await Donation.create({
      request_id, donor_id: req.user.id, medicine_name,
      quantity: Number(quantity),
      expiry_date: expiry_date || undefined,
      condition: condition || undefined,
      note: note || undefined,
      status: 'pending'
    });

    await Request.findByIdAndUpdate(request_id, { status: 'pending' });
    res.json({ success: true, donation });
  } catch (err) {
    console.error('Donate error:', err);
    res.json({ success: false, message: err.message });
  }
});

// ─── GET DONATIONS ────────────────────────────────────────────────────────────
app.get('/api/donations', authMiddleware, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'donor') query.donor_id = req.user.id;

    const donations = await Donation.find(query)
      .populate('donor_id', 'name email city')
      .populate({ path: 'request_id', populate: { path: 'ngo_id', select: 'name city' } })
      .sort({ createdAt: -1 });

    const formatted = donations.map(d => ({
      _id: d._id,
      medicine_name: d.medicine_name,
      quantity: d.quantity,
      expiry_date: d.expiry_date,
      condition: d.condition,
      note: d.note,
      status: d.status,
      admin_note: d.admin_note,
      createdAt: d.createdAt,
      donor_name: d.donor_id?.name,
      donor_email: d.donor_id?.email,
      request_id: d.request_id?._id,
      request_medicine: d.request_id?.medicine_name,
      request_city: d.request_id?.city,
      ngo_name: d.request_id?.ngo_id?.name
    }));

    res.json({ success: true, donations: formatted });
  } catch (err) {
    console.error('Get donations error:', err);
    res.json({ success: false, message: err.message });
  }
});

// ─── ADMIN: APPROVE ───────────────────────────────────────────────────────────
app.put('/api/approve/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.json({ success: false, message: 'Admin only' });

    // FIX 4: { new: true } ensures silent failures surface — if doc not found, updated === null
    const updated = await Donation.findByIdAndUpdate(
      req.params.id, { status: 'approved', admin_note: req.body.admin_note || '' }, { new: true }
    );
    if (!updated) return res.json({ success: false, message: 'Donation not found' });

    res.json({ success: true, message: 'Donation approved' });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// ─── ADMIN: REJECT ────────────────────────────────────────────────────────────
app.put('/api/reject/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.json({ success: false, message: 'Admin only' });

    const { reason } = req.body;
    if (!reason) return res.json({ success: false, message: 'Rejection reason is required' });

    const updated = await Donation.findByIdAndUpdate(
      req.params.id, { status: 'rejected', admin_note: reason }, { new: true }  // FIX 4
    );
    if (!updated) return res.json({ success: false, message: 'Donation not found' });

    res.json({ success: true, message: 'Donation rejected' });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// ─── NGO / ADMIN: CONFIRM RECEIPT ────────────────────────────────────────────
app.put('/api/confirm/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'ngo' && req.user.role !== 'admin')
      return res.json({ success: false, message: 'Not authorized' });

    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.json({ success: false, message: 'Donation not found' });

    await Donation.findByIdAndUpdate(req.params.id, { status: 'completed' }, { new: true });
    await Request.findByIdAndUpdate(donation.request_id, { status: 'fulfilled' }, { new: true });

    res.json({ success: true, message: 'Confirmed as completed' });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// ─── CATCH-ALL ────────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ MediDonate server running → http://localhost:${PORT}`);
});
