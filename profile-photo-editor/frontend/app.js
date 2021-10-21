function handleMouseDown(event) {
  drag.prevOffset.x = drag.offset.x;
  drag.prevOffset.y = drag.offset.y;
  drag.startPt.x = event.clientX;
  drag.startPt.y = event.clientY;
  drag.isDragging = true;
}

function handleMouseMove(event) {
  if (drag.isDragging === true) {
    drag.offset.x = drag.prevOffset.x + event.clientX - drag.startPt.x;
    drag.offset.y = drag.prevOffset.y + event.clientY - drag.startPt.y;
    eraseCanvas();
    drawImage();
  }
}

function handleMouseUp(event) {
  if (drag.isDragging === true) {
    drag.offset.x = drag.prevOffset.x + event.clientX - drag.startPt.x;
    drag.offset.y = drag.prevOffset.y + event.clientY - drag.startPt.y;
    drag.isDragging = false;
    eraseCanvas();
    drawImage();
  }
}

function handleNewImageChosen(event) {
  const imgFile = event.target.files[0];
  createImageBitmap(imgFile)
    .then((imgBmp) => {
      zoomSlider.valueAsNumber = zoomFactor = 1;
      document.querySelector('#zoom-value').textContent = '1';
      straightenSlider.valueAsNumber = straightenAngleRadians = 0;
      document.querySelector('#straighten-value').textContent = '0';
      drag = {
        isDragging: false,
        startPt: { x: 0, y: 0 },
        offset: { x: 0, y: 0 },
        prevOffset: { x: 0, y: 0 },
      };
      origImageBmp = imgBmp;
      eraseCanvas();
      drawImage();
    })
    .catch((err) => {
      console.error(`Error loading image: ${imgFile.name}`, err);
    });
}

function handleZoom(event) {
  document.querySelector('#zoom-value').textContent = event.target.value;
  zoomFactor = event.target.valueAsNumber;
  eraseCanvas();
  drawImage();
}

function handleStraighten(event) {
  document.querySelector('#straighten-value').textContent = event.target.value;
  const straightenAngleDeg = event.target.valueAsNumber;
  straightenAngleRadians = (straightenAngleDeg * Math.PI) / 180;
  eraseCanvas();
  drawImage();
}

function eraseCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawImage() {
  // Save the rendering context's state so we can restore it at the end.
  ctx.save();
  // Move the canvas origin to its center point, so we will rotate around that.
  ctx.translate(canvas.width / 2, canvas.height / 2);

  // Scale the image so that it just covers the crop frame, i.e. so that the
  // lesser of its width or height will be equal to the corresponding dimension
  // of the crop frame.
  let frameScaleFactor;
  if (origImageBmp.height <= origImageBmp.width) {
    // scale image so that height is same as crop frame height
    frameScaleFactor = cropFrameHt / origImageBmp.height;
  } else {
    // scale image so that width is same as crop frame width
    frameScaleFactor = cropFrameWd / origImageBmp.width;
  }
  const finalScaleFactor = frameScaleFactor * zoomFactor;

  const targetWidth = origImageBmp.width * finalScaleFactor;
  const targetHeight = origImageBmp.height * finalScaleFactor;
  const x = -targetWidth / 2 + drag.offset.x;
  const y = -targetHeight / 2 + drag.offset.y;

  // Draw the entire image dimly.
  ctx.rotate(straightenAngleRadians);
  ctx.globalAlpha = 0.3;
  ctx.drawImage(origImageBmp, x, y, targetWidth, targetHeight);

  // Redraw the area inside the crop frame brightly.
  // const sx = (targetWidth - cropFrameWd) / 2 / finalScaleFactor;
  // const sy = (targetHeight - cropFrameHt) / 2 / finalScaleFactor;
  // const sWidth = cropFrameWd / finalScaleFactor;
  // const sHeight = cropFrameHt / finalScaleFactor;
  // const dx = -cropFrameWd / 2;
  // const dy = -cropFrameHt / 2;

  // Set the clipping region to inside the crop frame.
  ctx.rotate(-straightenAngleRadians);
  ctx.beginPath();
  ctx.rect(-cropFrameWd / 2, -cropFrameHt / 2, cropFrameWd, cropFrameHt);
  ctx.clip();

  // Redraw the entire image; the clipping region will ensure only the area
  // inside the crop frame is redrawn brightly.
  ctx.rotate(straightenAngleRadians);
  ctx.globalAlpha = 1.0;
  ctx.drawImage(origImageBmp, x, y, targetWidth, targetHeight);

  ctx.restore();
}

// sendProfilePhotoToServer(data) accepts the base64-encoded photo image data as its sole
// parameter, and sends an HTTP POST request (using XMLHttpRequest interface) to
// the server with body containing the photo image data.

function sendProfilePhotoToServer(encodedPhotoData) {
  const requestBody = JSON.stringify({ photo: encodedPhotoData });

  const request = new XMLHttpRequest();
  request.open('PUT', 'http://127.0.0.1:5000/profilePhoto/', true);
  // We use a content-type of JSON since we are sending the photo image data
  // wrapped in a JSON format string.
  // request.setRequestHeader('Content-type', 'application/json');
  request.setRequestHeader('Content-type', 'text/plain');
  request.onreadystatechange = () => {
    // In local files, status is 0 upon success in Mozilla Firefox.
    if (request.readyState === XMLHttpRequest.DONE) {
      const status = request.status;
      if (status === 0 || (status >= 200 && status < 400)) {
        // The request completed successfully.
        console.log(request.responseText);
      } else {
        // An error has occurred with the request.
        console.error('An error has occurred with your request.', request);
      }
    }
  };
  request.send(requestBody);
}

function base64Encode(imgData, imgType, callback) {
  const conversionCanvas = document.createElement('canvas');
  const conversionCtx = conversionCanvas.getContext('2d');
  conversionCanvas.width = imgData.width;
  conversionCanvas.height = imgData.height;
  conversionCtx.putImageData(imgData, 0, 0);
  const encodedImage = conversionCanvas.toDataURL(imgType);
  callback(encodedImage);
}

function uploadProfilePhoto(imgData, imgType) {
  base64Encode(imgData, imgType, (encodedImageDataURL) => {
    sendProfilePhotoToServer(encodedImageDataURL);
  });
}

function cropCanvasImage() {
  const cropFrameLeft = (canvas.width - cropFrameWd) / 2;
  const cropFrameTop = (canvas.height - cropFrameHt) / 2;
  const pixelData = ctx.getImageData(
    cropFrameLeft,
    cropFrameTop,
    cropFrameWd,
    cropFrameHt
  );
  return pixelData;
}

function handleSavePhoto(event) {
  // Extract the portion of the image inside the crop frame
  // (given the drag position, zoom, straighten angle).
  const croppedImage = cropCanvasImage();
  uploadProfilePhoto(croppedImage, 'image/png');
}

let origImageBmp = null;
let zoomFactor = 1;
let straightenAngleRadians = 0;
// These values must stay in sync with the values in markup.
const cropFrameWd = 250; // in pixels
const cropFrameHt = 250;

let drag = {
  isDragging: false,
  startPt: { x: 0, y: 0 },
  offset: { x: 0, y: 0 },
  prevOffset: { x: 0, y: 0 },
};

const canvasCropWrapper = document.querySelector('#canvas-crop-wrapper');
canvasCropWrapper.addEventListener('mousedown', handleMouseDown);
canvasCropWrapper.addEventListener('mousemove', handleMouseMove);
canvasCropWrapper.addEventListener('mouseup', handleMouseUp);

const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');

const zoomSlider = document.querySelector('#zoom-slider');
zoomSlider.valueAsNumber = zoomFactor;
zoomSlider.addEventListener('input', handleZoom);
const straightenSlider = document.querySelector('#straighten-slider');
straightenSlider.valueAsNumber = straightenAngleRadians;
straightenSlider.addEventListener('input', handleStraighten);
const changePhotoInputEl = document.querySelector('#change-photo-input');
changePhotoInputEl.addEventListener('change', handleNewImageChosen);
const savePhotoButton = document.querySelector('#save-photo-button');
savePhotoButton.addEventListener('click', handleSavePhoto);
