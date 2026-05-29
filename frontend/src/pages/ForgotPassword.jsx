import React, { useState, useEffect } from 'react';
import api from '../api/api.js';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff, FiArrowLeft, FiMail, FiLock, FiHash } from 'react-icons/fi';
import '../assets/css/ForgotPassword.css';

const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{6,16}$/;
const toastStyle = { borderRadius: '0', background: '#111', color: '#ccc', border: '1px solid #222', fontFamily: 'DM Mono, monospace', fontSize: '12px' };

const ForgotPassword = () => {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const [animKey, setAnimKey] = useState(0);

    const [formData, setFormData] = useState({ code: '', newPassword: '', confirmPassword: '' });
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [matchError, setMatchError] = useState('');

    const navigate = useNavigate();

    // Cooldown timer
    useEffect(() => {
        if (cooldown <= 0) return;
        const t = setTimeout(() => setCooldown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [cooldown]);

    const goToStep = (n) => {
        setAnimKey(k => k + 1);
        setStep(n);
    };

    // ── PASO 1 ────────────────────────────────────────────────────────
    const handleSendCode = async (e) => {
        e.preventDefault();
        if (cooldown > 0) return;
        setLoading(true);
        try {
            const res = await api.post('/auth/forgot-password', { email });
            toast.success(res.data.message || 'Código enviado.', { style: toastStyle });
            setCooldown(60);
            goToStep(2);
        } catch (err) {
            const msg = err.response?.data?.detail || err.response?.data?.message || 'Error al enviar el código.';
            toast.error(msg, { style: toastStyle });
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (cooldown > 0) return;
        setLoading(true);
        try {
            const res = await api.post('/auth/forgot-password', { email });
            toast.success(res.data.message || 'Código reenviado.', { style: toastStyle });
            setCooldown(60);
        } catch (err) {
            const msg = err.response?.data?.detail || err.response?.data?.message || 'Error al reenviar.';
            toast.error(msg, { style: toastStyle });
        } finally {
            setLoading(false);
        }
    };

    // ── PASO 2 ────────────────────────────────────────────────────────
    const handleChange = (e) => {
        const { name, value } = e.target;
        const key = name === 'verification_code' ? 'code' : name;  // ← esto
        const updated = { ...formData, [key]: value };
        setFormData(updated);
        if (name === 'newPassword') {
            setPasswordError(value.length > 0 && !passwordRegex.test(value)
                ? '6-16 chars · 1 mayúscula · 1 especial'
                : '');
        }
        if (name === 'newPassword' || name === 'confirmPassword') {
            setMatchError(updated.confirmPassword.length > 0 && updated.newPassword !== updated.confirmPassword
                ? 'Las contraseñas no coinciden'
                : '');
        }
    };

    const handleReset = async (e) => {
        e.preventDefault();
        if (passwordError || matchError) { toast.error('Corregí los errores primero.', { style: toastStyle }); return; }
        if (!formData.code || !formData.newPassword || !formData.confirmPassword) { toast.error('Completá todos los campos.', { style: toastStyle }); return; }
        setLoading(true);
        try {
            const res = await api.post('/auth/reset-password', {
                email,
                code: formData.code,
                password: formData.newPassword,
                confirmar_password: formData.confirmPassword
            });
            toast.success(res.data.message || 'Contraseña actualizada.', { style: toastStyle });
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            const msg = err.response?.data?.detail || err.response?.data?.message || 'Error al actualizar.';
            toast.error(msg, { style: toastStyle });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <style>{STYLES}</style>
            <div className="fp-root">
                <div className="fp-card">
                    <div className="fp-inner">

                        {/* Progress */}
                        <div className="fp-progress">
                            <div className={`fp-progress-bar ${step >= 1 ? 'active' : ''}`} />
                            <div className={`fp-progress-bar ${step >= 2 ? 'active' : ''}`} />
                        </div>

                        {/* ── PASO 1 ── */}
                        {step === 1 && (
                            <div key={animKey} className="fp-slide-enter">
                                <div className="fp-step-badge"><span />01 / 02</div>
                                <h1 className="fp-title">Recuperar<br />contraseña</h1>
                                <p className="fp-subtitle">Ingresá tu email y te enviamos<br />un código de verificación.</p>

                                <form className="fp-form" onSubmit={handleSendCode}>
                                    <div className="fp-field">
                                        <input
                                            className="fp-input"
                                            type="email"
                                            placeholder="tu@email.com"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            required
                                            style={{ paddingLeft: '44px' }}
                                        />
                                        <span className="fp-field-icon" style={{ pointerEvents: 'none' }}>
                                            <FiMail size={15} />
                                        </span>
                                    </div>
                                    <button className="fp-btn-primary" type="submit" disabled={loading}>
                                        {loading ? 'Enviando...' : 'Enviar código'}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* ── PASO 2 ── */}
                        {step === 2 && (
                            <div key={animKey} className="fp-slide-enter">
                                <div className="fp-step-badge"><span />02 / 02</div>
                                <h1 className="fp-title">Nueva<br />contraseña</h1>
                                <p className="fp-subtitle">
                                    Código enviado a<br /><strong>{email}</strong>
                                </p>

                                <form className="fp-form" onSubmit={handleReset}>
                                    {/* Código */}
                                    <div className="fp-field">
                                        <input
                                            className="fp-input"
                                            type="text"
                                            name="verification_code" 
                                            placeholder="Código de 6 dígitos"
                                            maxLength="6"
                                            value={formData.code}
                                            onChange={handleChange}
                                            required
                                            autoComplete="off"
                                            style={{ paddingLeft: '44px', fontFamily: 'DM Mono, monospace', letterSpacing: '0.2em' }}
                                        />
                                        <span className="fp-field-icon"><FiHash size={15} /></span>
                                    </div>

                                    {/* Nueva contraseña */}
                                    <div className="fp-field">
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                className={`fp-input${passwordError ? ' error' : ''}`}
                                                type={showNew ? 'text' : 'password'}
                                                name="verification_code" 
                                                placeholder="Nueva contraseña"
                                                value={formData.newPassword}
                                                onChange={handleChange}
                                                required
                                                autoComplete="off"
                                                style={{ paddingLeft: '44px' }}
                                            />
                                            <span className="fp-field-icon"><FiLock size={15} /></span>
                                            <button type="button" className="fp-eye-btn" onClick={() => setShowNew(v => !v)}>
                                                {showNew ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                                            </button>
                                        </div>
                                        {passwordError && <div className="fp-error-text">↳ {passwordError}</div>}
                                    </div>

                                    {/* Confirmar contraseña */}
                                    <div className="fp-field">
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                className={`fp-input${matchError ? ' error' : ''}`}
                                                type={showConfirm ? 'text' : 'password'}
                                                name="confirmPassword"
                                                placeholder="Confirmar contraseña"
                                                value={formData.confirmPassword}
                                                onChange={handleChange}
                                                required
                                                style={{ paddingLeft: '44px' }}
                                            />
                                            <span className="fp-field-icon"><FiLock size={15} /></span>
                                            <button type="button" className="fp-eye-btn" onClick={() => setShowConfirm(v => !v)}>
                                                {showConfirm ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                                            </button>
                                        </div>
                                        {matchError && <div className="fp-error-text">↳ {matchError}</div>}
                                    </div>

                                    <button className="fp-btn-primary" type="submit" disabled={loading}>
                                        {loading ? 'Actualizando...' : 'Actualizar contraseña'}
                                    </button>

                                    {/* Reenviar código */}
                                    <div className="fp-resend">
                                        {cooldown > 0
                                            ? <span className="fp-resend-text">Reenviar en {cooldown}s</span>
                                            : <button type="button" className="fp-resend-btn" onClick={handleResend} disabled={loading}>
                                                Reenviar código
                                                </button>
                                        }
                                    </div>

                                    <button type="button" className="fp-btn-ghost" onClick={() => goToStep(1)}>
                                        <FiArrowLeft size={13} /> Cambiar email
                                    </button>
                                </form>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </>
    );
};

export default ForgotPassword;
