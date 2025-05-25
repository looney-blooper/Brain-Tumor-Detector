const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();
const PORT = 5000;

app.use(cors());

// Multer setup
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/dicom'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type'), false);
    }
    cb(null, true);
  }
});

// Route to handle image upload
app.post('/upload', upload.single('image'), (req, res) => {
  // Check if the file is uploaded
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded or unsupported type' });
  }

  // Saving the file locally
  const filePath = path.join(__dirname, 'uploads', req.file.originalname);

  fs.writeFile(filePath, req.file.buffer, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to save the file' });
    }

    // Call the Python script for inference after saving the file
    const python = spawn('python', ['model_inference.py', filePath], {
      env: { ...process.env, TF_CPP_MIN_LOG_LEVEL: '3' }, // Suppress TensorFlow warnings
    });

    let output = '';
    let errorOutput = '';

    // Capture stdout (successful output)
    python.stdout.on('data', (data) => {
      output += data.toString();
    });

    // Capture stderr (error logs)
    python.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    // On Python script exit
    python.on('close', (code) => {
      if (code === 0) {
        // Clean up the output by removing ANSI escape codes
        const cleanOutput = output.replace(/\x1B\[\d+m/g, '').trim(); // Remove ANSI codes

        // You can further parse the clean output to extract the tumor type if needed
        let tumorType;

        if (cleanOutput.includes('Glioma')) {
          tumorType = 'Glioma';
        } else if (cleanOutput.includes('Meningioma')) {
          tumorType = 'Meningioma';
        } else if (cleanOutput.includes('No Tumor')) {
          tumorType = 'No Tumor';
        } else if (cleanOutput.includes('Pituitary Tumor')) {
          tumorType = 'Pituitary Tumor';
        } else {
          tumorType = 'Unknown'; // In case none of the conditions match
        } // Example of extraction

        if (!res.headersSent) {
          res.json({ message: 'Prediction successful', result: tumorType });
        }
      } else {
        console.error('Python script error:', errorOutput);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Python script error', details: errorOutput });
        }
      }
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
