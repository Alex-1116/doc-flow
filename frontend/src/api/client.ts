import axios from 'axios';
import { API_URL, REQUEST_TIMEOUT } from '../config/api';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;