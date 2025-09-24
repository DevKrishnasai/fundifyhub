'use client';

import { useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
}

interface Payment {
  id: string;
  amount: string;
  status: string;
  payment_method: string | null;
  created_at: string;
  user: {
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
}

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch users
      const usersResponse = await fetch(`${API_BASE_URL}/users`);
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.data || []);
      }

      // Fetch payments
      const paymentsResponse = await fetch(`${API_BASE_URL}/payments`);
      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json();
        setPayments(paymentsData.data || []);
      }

    } catch (err) {
      setError('Failed to fetch data from backend');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{padding: '20px', textAlign: 'center'}}>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{padding: '20px', textAlign: 'center', color: 'red'}}>
        <p>{error}</p>
        <button onClick={fetchData} style={{marginTop: '10px', padding: '5px 10px'}}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{padding: '20px'}}>
      <h1>FundifyHub 🚀</h1>
      <button onClick={fetchData} style={{marginBottom: '20px', padding: '5px 10px'}}>
        Refresh
      </button>

      <div style={{display: 'flex', gap: '20px', flexWrap: 'wrap'}}>
        {/* Users */}
        <div style={{flex: '1', minWidth: '300px', border: '1px solid #ddd', padding: '15px'}}>
          <h2>Users ({users.length})</h2>
          {users.length > 0 ? (
            <div>
              {users.map((user) => (
                <div key={user.id} style={{marginBottom: '10px', padding: '10px', backgroundColor: '#f5f5f5'}}>
                  <strong>
                    {user.first_name && user.last_name 
                      ? `${user.first_name} ${user.last_name}` 
                      : user.email}
                  </strong>
                  <br />
                  <small>{user.email}</small>
                  <br />
                  <small>Joined: {new Date(user.created_at).toLocaleDateString()}</small>
                </div>
              ))}
            </div>
          ) : (
            <p>No users found</p>
          )}
        </div>

        {/* Payments */}
        <div style={{flex: '1', minWidth: '300px', border: '1px solid #ddd', padding: '15px'}}>
          <h2>Payments ({payments.length})</h2>
          {payments.length > 0 ? (
            <div>
              {payments.map((payment) => (
                <div key={payment.id} style={{marginBottom: '10px', padding: '10px', backgroundColor: '#f5f5f5'}}>
                  <strong>₹{payment.amount}</strong>
                  <span style={{
                    marginLeft: '10px',
                    padding: '2px 6px',
                    fontSize: '12px',
                    backgroundColor: 
                      payment.status === 'COMPLETED' ? '#d4edda' :
                      payment.status === 'PENDING' ? '#fff3cd' :
                      payment.status === 'FAILED' ? '#f8d7da' : '#e2e3e5',
                    color:
                      payment.status === 'COMPLETED' ? '#155724' :
                      payment.status === 'PENDING' ? '#856404' :
                      payment.status === 'FAILED' ? '#721c24' : '#383d41'
                  }}>
                    {payment.status}
                  </span>
                  <br />
                  <small>
                    {payment.user.first_name && payment.user.last_name 
                      ? `${payment.user.first_name} ${payment.user.last_name}` 
                      : payment.user.email}
                  </small>
                  <br />
                  <small>{new Date(payment.created_at).toLocaleDateString()}</small>
                  {payment.payment_method && (
                    <>
                      <br />
                      <small>Method: {payment.payment_method}</small>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p>No payments found</p>
          )}
        </div>
      </div>
    </div>
  );
}