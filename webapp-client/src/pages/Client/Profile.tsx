import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { getProfile, updateProfile } from '../../api';

const Profile: React.FC = () => {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    telephone: '',
    address: '',
    password: '',
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const data = await getProfile();
      setForm({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        telephone: data.telephone || '',
        address: data.address || '',
        password: '',
      });
    };
    fetchProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile(form);
    alert('Profile updated!');
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Optionally, reload profile data
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
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                id="address"
                type="text"
                name="address"
                autoComplete="street-address"
                value={form.address}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                autoComplete="new-password"
                value={form.password}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="Enter new password"
              />
            </div>
            <div className="flex space-x-4 mt-6">
              <button
                type="submit"
                className="flex items-center px-5 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 font-semibold"
              >
            
                Update
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center px-5 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-semibold"
              >
             
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
