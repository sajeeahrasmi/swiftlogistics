import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { getProfile, updateProfile } from '../../api';

const Profile: React.FC = () => {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    telephone: '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await getProfile();
        console.log('Profile API response:', response);
        
        // Extract user data from response structure
        const userData = response.data?.user || response.user || response;
        
        setForm({
          firstName: userData.first_name || '',
          lastName: userData.last_name || '',
          email: userData.email || '',
          telephone: userData.phone || '',
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
        alert('Failed to load profile data. Please try again.');
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Only update profile fields that are supported by the backend
      const profileUpdateData = {
        firstName: form.firstName,
        lastName: form.lastName,
        telephone: form.telephone,
      };
      
      await updateProfile(profileUpdateData);
      alert('Profile updated successfully!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      alert(`Failed to update profile: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role="client" />
      <div className="flex-1 p-10">
        <div className="max-w-xl mx-auto bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold mb-6 text-amber-900">Edit Profile</h2>
          <form onSubmit={handleUpdate} className="space-y-5">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                id="firstName"
                type="text"
                name="firstName"
                autoComplete="given-name"
                value={form.firstName}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                id="lastName"
                type="text"
                name="lastName"
                autoComplete="family-name"
                value={form.lastName}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg"
                required
                disabled
              />
            </div>
            <div>
              <label htmlFor="telephone" className="block text-sm font-medium text-gray-700 mb-1">Telephone Number</label>
              <input
                id="telephone"
                type="tel"
                name="telephone"
                autoComplete="tel"
                value={form.telephone}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div className="flex space-x-4 mt-6">
              <button
                type="submit"
                className="flex items-center px-5 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 font-semibold"
              >
                Update
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
