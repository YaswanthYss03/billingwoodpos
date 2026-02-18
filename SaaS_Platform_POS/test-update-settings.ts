import axios from 'axios';

async function testUpdateSettings() {
  try {
    // First login
    const loginRes = await axios.post('http://localhost:4000/auth/login', {
      username: 'restaurant_admin',
      password: 'admin123'
    });
    
    const token = loginRes.data.accessToken;
    console.log('Logged in successfully');
    console.log('Tenant:', JSON.stringify(loginRes.data.tenant, null, 2));
    
    // Update settings
    const updateRes = await axios.patch(
      'http://localhost:4000/tenants/settings',
      { kotEnabled: false },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log('\nSettings updated successfully');
    console.log('Updated tenant:', JSON.stringify(updateRes.data, null, 2));
  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testUpdateSettings();
