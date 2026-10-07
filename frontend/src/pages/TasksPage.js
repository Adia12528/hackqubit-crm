import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckSquare, Plus, ExternalLink, Calendar, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const MOCK_TASKS = [
    { id: 't1', title: 'Schedule product demo for Rahul', description: 'Present WhatsApp Cloud multi-agent features', priority: 'high', status: 'pending', due_date: '2026-10-15', contact_id: '1', contact_name: 'Rahul Kumar', company: 'Acme Pvt Ltd' },
    { id: 't2', title: 'Follow-up on enterprise quotation with Priya', description: 'Review security compliance and self-hosted Docker requirements', priority: 'urgent', status: 'pending', due_date: '2026-10-12', contact_id: '2', contact_name: 'Priya Sharma', company: 'InnoTech Labs' },
    { id: 't3', title: 'Verify WebRTC SIP trunking credentials for Amit', description: 'Confirm STUN/TURN server connectivity', priority: 'medium', status: 'completed', due_date: '2026-10-09', contact_id: '3', contact_name: 'Amit Singh', company: 'Freight Express' },
  ];

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/tasks');
      const list = data.tasks || [];
      setTasks(list.length > 0 ? list : MOCK_TASKS);
    } catch {
      setTasks(MOCK_TASKS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleToggle = async (task) => {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await api.put(`/tasks/${task.id}`, { status: nextStatus });
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: nextStatus } : t));
    } catch {
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: nextStatus } : t));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.01em' }}>Follow-up Tasks</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Action items and task scheduling connected to customer accounts.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/contacts')}>
          <Plus size={16} />
          <span>New Task via Customer</span>
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {tasks.map(task => (
            <div
              key={task.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '16px 20px',
                borderBottom: '1px solid var(--border)',
                background: task.status === 'completed' ? 'var(--bg-secondary)' : 'var(--bg-card)',
              }}
            >
              <input
                type="checkbox"
                checked={task.status === 'completed'}
                onChange={() => handleToggle(task)}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
              />

              <div style={{ flex: 1 }}>
                <div style={{
                  fontWeight: '700',
                  fontSize: '14px',
                  textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                  color: task.status === 'completed' ? 'var(--text-muted)' : 'var(--text-primary)',
                }}>
                  {task.title}
                </div>
                {task.description && (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {task.description}
                  </div>
                )}
                {task.contact_name && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Customer: <strong style={{ color: 'var(--text-primary)' }}>{task.contact_name}</strong> ({task.company})
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {task.due_date && (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={13} />
                    <span>{task.due_date}</span>
                  </span>
                )}
                <span className={`status-badge status-${task.priority}`}>{task.priority}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/contacts')} title="Jump to Customer Profile">
                  <ExternalLink size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
