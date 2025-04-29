import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

interface RSVPFormData {
  name: string;
  attending: boolean;
  bringing_guests: boolean;
  guest_count: number;
  guest_names: string;
  items_bringing: string;
}

const RSVPForm: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [formData, setFormData] = useState<RSVPFormData>({
    name: '',
    attending: false,
    bringing_guests: false,
    guest_count: 0,
    guest_names: '',
    items_bringing: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await axios.post(`/api/events/${slug}/rsvp`, formData);
      setSuccess(true);
    } catch (err) {
      setError('Failed to submit RSVP. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Thank You!</h2>
        <p>Your RSVP has been submitted successfully.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">RSVP Form</h2>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="attending"
              checked={formData.attending}
              onChange={handleChange}
              className="mr-2"
            />
            Are you attending?
          </label>
        </div>

        {formData.attending && (
          <>
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="bringing_guests"
                  checked={formData.bringing_guests}
                  onChange={handleChange}
                  className="mr-2"
                />
                Are you bringing any guests?
              </label>
            </div>

            {formData.bringing_guests && (
              <>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">Number of Guests</label>
                  <input
                    type="number"
                    name="guest_count"
                    value={formData.guest_count}
                    onChange={handleChange}
                    min="1"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">Guest Names</label>
                  <textarea
                    name="guest_names"
                    value={formData.guest_names}
                    onChange={handleChange}
                    placeholder="Please list the names of your guests"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </>
            )}

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">What items are you bringing?</label>
              <textarea
                name="items_bringing"
                value={formData.items_bringing}
                onChange={handleChange}
                placeholder="List any items you plan to bring to the event"
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-blue-300"
        >
          {isSubmitting ? 'Submitting...' : 'Submit RSVP'}
        </button>
      </form>
    </div>
  );
};

export default RSVPForm; 