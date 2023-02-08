import { useToast } from 'vue-toastification';

import { VITE_BASE_API_PATH } from './env.js';

const toast = useToast();

export default (path, options) =>
  fetch(`${VITE_BASE_API_PATH}${path}`, {
    credentials: 'include',
    method: 'POST',
    body: JSON.stringify({}),
    ...options,
  })
    .then(result => result.json())
    .then(({ failure, result }) => {
      switch (failure) {
        case undefined:
          return result;
        case 'USER_NOT_FOUND':
          toast.error('User not found, please login again');
        case 'ALREADY_LINKED':
          toast.error('This discord account is already linked');
        case 'UNAUTHORIZED':
        default:
          console.error(failure);
      }
    })
    .catch(error => {
      console.dir({ error });
    });
