import axiosClient from './axiosClient';

const contentApi = {
  latestReviews: (limit = 6) => axiosClient.get('/reviews/latest', { params: { limit } }),
  sendContact: (data) => axiosClient.post('/contact', data),
};

export default contentApi;
