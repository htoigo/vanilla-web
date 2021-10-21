import express from 'express';

const app = express();
const port = process.env.PORT || 5000;

// app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Express server, at your service.');
});

app.options('/profilePhoto', (req, res) => {
  const origin = req.get('Origin');
  console.log('origin: ', origin);
  if (
    origin === 'http://localhost:8080' ||
    origin === 'http://127.0.0.1:8080'
  ) {
    // This is a preflight request to PUT a profile photo. During development,
    // it will probably come from Origin: null, since that seems to be what Firefox
    // uses for a file:///path/to/my/index.html origin.
    // Use CORS to tell the browser to allow the origin, etc.
    res.set({
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'PUT, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
      'Access-Control-Max-Age': '600',
      Vary: 'Origin',
    });
    res.sendStatus(204);
  }
});

// Handle the actual PUT request to change a profile photo.
// The body of the request is a JSON string: {photo: encodedImageData }, where
// encodedImageData is a base64-encoded data URL of the photo image of the form:
//   'data:image/png;base64,iVBORw0KGgoAAAANS....'
app.put('/profilePhoto', (req, res) => {
  console.log('PUT /profilePhoto body: ', req.body);
  // If the user did not have a profile photo and the PUT request has created one,
  // we should return status code 201 (Created); if they already had a profile photo
  // and this PUT request has successfully modified it, then we should return either
  // 200 (OK) or 204 (No Content) to indicate successful completion of the request.
  res.status(201).send('User profile photo updated.');
});

app.use((err, req, res, next) => {
  res.status(500).send({ message: err.message });
});

app.listen(port, () => {
  console.log(`Express server listenting on http://localhost:${port}`);
});
