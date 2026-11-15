import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { db } from '../db/storageAdapter.js';
import { config } from '../config/index.js';
import { authenticateJwt } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';
const router = Router();
// Registration schema
const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    full_name: z.string().min(2, 'Full name is required'),
    role: z.enum(['elderly', 'family', 'caregiver', 'admin']),
    phone: z.string().optional(),
    date_of_birth: z.string().optional(),
    blood_group: z.string().optional(),
    primary_condition: z.string().optional(),
    allergies: z.array(z.string()).optional()
});
// Login schema
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1, 'Password is required')
});
// Demo Login schema
const demoLoginSchema = z.object({
    role: z.enum(['elderly', 'family', 'caregiver', 'admin'])
});
// POST /api/auth/register
router.post('/register', authLimiter, (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
        return;
    }
    const { email, password, full_name, role, phone, date_of_birth, blood_group, primary_condition, allergies } = parsed.data;
    const existing = db.getProfileByEmail(email);
    if (existing) {
        res.status(409).json({ error: 'An account with this email address already exists.' });
        return;
    }
    const passwordHash = bcrypt.hashSync(password, 10);
    const userId = uuidv4();
    const userProfile = db.createProfile({
        id: userId,
        email,
        password_hash: passwordHash,
        full_name,
        role: role,
        phone,
        preferred_language: 'en',
        created_at: new Date().toISOString()
    });
    let patientId;
    if (role === 'elderly') {
        const patientProfile = db.createPatientProfile({
            id: uuidv4(),
            user_id: userId,
            date_of_birth,
            blood_group,
            primary_condition,
            allergies: allergies || [],
            created_at: new Date().toISOString()
        });
        patientId = patientProfile.id;
    }
    // Set default notification preferences
    db.updateNotificationPreferences(userId, {
        email_enabled: true,
        upcoming_dose_minutes: 15,
        missed_dose_grace_minutes: 30,
        appointment_reminders_enabled: true,
        caregiver_escalation_enabled: true,
        daily_digest_enabled: true
    });
    // Log audit
    db.logAudit({
        actor_id: userId,
        patient_id: patientId,
        action: 'REGISTER',
        resource_type: 'USER',
        resource_id: userId,
        details: { role, email }
    });
    const token = jwt.sign({ id: userProfile.id, email: userProfile.email, role: userProfile.role }, config.jwtSecret, { expiresIn: '7d' });
    res.status(201).json({
        message: 'Account successfully registered.',
        token,
        user: {
            id: userProfile.id,
            email: userProfile.email,
            full_name: userProfile.full_name,
            role: userProfile.role,
            patient_id: patientId
        }
    });
});
// POST /api/auth/login
router.post('/login', authLimiter, (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });
        return;
    }
    const { email, password } = parsed.data;
    const user = db.getProfileByEmail(email);
    if (!user || !user.password_hash) {
        res.status(401).json({ error: 'Invalid email address or password.' });
        return;
    }
    const matches = bcrypt.compareSync(password, user.password_hash);
    if (!matches) {
        res.status(401).json({ error: 'Invalid email address or password.' });
        return;
    }
    let patientId;
    if (user.role === 'elderly') {
        const patient = db.getPatientProfileByUserId(user.id);
        patientId = patient?.id;
    }
    db.logAudit({
        actor_id: user.id,
        patient_id: patientId,
        action: 'LOGIN',
        resource_type: 'SESSION',
        resource_id: user.email,
        details: { role: user.role }
    });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, config.jwtSecret, { expiresIn: '7d' });
    res.json({
        message: 'Login successful.',
        token,
        user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            patient_id: patientId
        }
    });
});
// POST /api/auth/demo-login (1-Click instant login for hackathon evaluators)
router.post('/demo-login', (req, res) => {
    const parsed = demoLoginSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Role must be one of: elderly, family, caregiver, admin' });
        return;
    }
    const roleEmails = {
        elderly: 'eleanor@careverse.demo',
        family: 'david@careverse.demo',
        caregiver: 'sarah@careverse.demo',
        admin: 'admin@careverse.demo'
    };
    const targetEmail = roleEmails[parsed.data.role];
    const user = db.getProfileByEmail(targetEmail);
    if (!user) {
        res.status(404).json({ error: `Demo account for role '${parsed.data.role}' not found.` });
        return;
    }
    let patientId;
    if (user.role === 'elderly') {
        const patient = db.getPatientProfileByUserId(user.id);
        patientId = patient?.id;
    }
    db.logAudit({
        actor_id: user.id,
        patient_id: patientId,
        action: 'DEMO_LOGIN',
        resource_type: 'SESSION',
        resource_id: user.email,
        details: { role: user.role, is_demo: true }
    });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, config.jwtSecret, { expiresIn: '7d' });
    res.json({
        message: `Logged in as demo ${user.role} (${user.full_name}).`,
        token,
        user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            patient_id: patientId
        }
    });
});
// GET /api/auth/me
router.get('/me', authenticateJwt, (req, res) => {
    res.json({ user: req.user });
});
// POST /api/auth/logout
router.post('/logout', authenticateJwt, (req, res) => {
    if (req.user) {
        db.logAudit({
            actor_id: req.user.id,
            patient_id: req.user.patient_id,
            action: 'LOGOUT',
            resource_type: 'SESSION',
            resource_id: req.user.email
        });
    }
    res.json({ message: 'Successfully logged out.' });
});
export default router;
