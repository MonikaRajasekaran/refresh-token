const dotenv = require('dotenv');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

// Configuring dotenv
dotenv.config();
const app = express();

// Setting up middlewares to parse request body and cookies
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

const userCredentials = {
  username: 'admin',
  password: 'admin123',
  email: 'admin@gmail.com'
};

// Login route to generate access and refresh tokens
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username === userCredentials.username && password === userCredentials.password) {
    const accessToken = jwt.sign(
      {
        username: userCredentials.username,
        email: userCredentials.email
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: '30s' // Access token expires in 30 seconds
      }
    );

    const refreshToken = jwt.sign(
      {
        username: userCredentials.username
      },
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: '30s' // Refresh token also expires in 30 seconds
      }
    );

    res.cookie('jwt', refreshToken, {
      httpOnly: true,
      sameSite: 'None',
      secure: true,
      maxAge: 30 * 1000 // 30 seconds
    });

    return res.json({ accessToken });
  } else {
    return res.status(406).json({ message: 'Invalid credentials' });
  }
});

// Refresh route to generate a new access token
app.post('/refresh', (req, res) => {
  if (req.cookies?.jwt) {
    const refreshToken = req.cookies.jwt;

    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        return res.status(406).json({ message: 'Unauthorized' });
      } else {
        const accessToken = jwt.sign(
          {
            username: userCredentials.username,
            email: userCredentials.email
          },
          process.env.ACCESS_TOKEN_SECRET,
          {
            expiresIn: '30s' // New access token expires in 30 seconds
          }
        );

        // Optionally refresh the refresh token as well
        const newRefreshToken = jwt.sign(
          {
            username: userCredentials.username
          },
          process.env.REFRESH_TOKEN_SECRET,
          {
            expiresIn: '30s' // New refresh token also expires in 30 seconds
          }
        );

        res.cookie('jwt', newRefreshToken, {
          httpOnly: true,
          sameSite: 'None',
          secure: true,
          maxAge: 30 * 1000 // 30 seconds
        });

        return res.json({ accessToken });
      }
    });
  } else {
    return res.status(406).json({ message: 'Unauthorized' });
  }
});

// Endpoint to check token expiry
app.get('/check-expiry', (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (token) {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: 'Unauthorized' });
      } else {
        const now = Math.floor(Date.now() / 1000); // Current time in seconds
        const expiry = decoded.exp;
        const timeLeft = expiry - now;
        return res.json({ expiry, timeLeft });
      }
    });
  } else {
    return res.status(400).json({ message: 'Token not provided' });
  }
});

app.listen(5000, () => {
  console.log(`Server active on http://localhost:5000!`);
});
