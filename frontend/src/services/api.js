// src/services/api.js
import axios from 'axios';
import { API_BASE_URL } from '../constants';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

export const fetchFormConfig = async () => {
  const response = await apiClient.get('/api/form-config');
  return response.data;
};

export const fetchFormSubmission = async (formId) => {
  const response = await apiClient.get(`/api/form-submission/${formId}`);
  return response.data;
};

export const createFormSubmission = async (data) => {
  const response = await apiClient.post('/api/submit-form', data);
  return response.data; // Assuming the response contains the new { id }
};

export const updateFormSubmission = async (formId, data) => {
  console.log("Received update payload:", data);
  const response = await apiClient.put(`/api/update-form/${formId}`, data);
  console.log(response.data);
  return response.data;
};

export const updateAdminFormConfig = async (config) => {
    const response = await apiClient.post('/api/update-form-config', config);
    return response.data;
}