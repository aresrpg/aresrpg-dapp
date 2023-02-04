const BASE_PATH = 'http://localhost:8888';
// const BASE_PATH = '/.netlify/edge-functions/'

export default (path, options) =>
  fetch(`${BASE_PATH}${path}`, {
    credentials: 'include',
    method: 'POST',
    body: JSON.stringify({}),
    ...options,
  })
    .then(result => result.json())
    .then(({ failure, result }) => {
      if (failure) throw failure;
      return result;
    });
