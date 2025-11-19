export const get404HTML = (requestedUrl: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - Page Not Found</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg,rgb(32, 32, 36) 0%,rgb(16, 16, 17) 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #333;
        }
        
        .container {
            background: white;
            border-radius: 20px;
            padding: 3rem;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 500px;
            width: 90%;
        }
        
        .error-code {
            font-size: 8rem;
            font-weight: bold;
            color: #667eea;
            line-height: 1;
            margin-bottom: 1rem;
        }
        
        .error-title {
            font-size: 2rem;
            font-weight: 600;
            margin-bottom: 1rem;
            color: #333;
        }
        
        .error-message {
            font-size: 1.1rem;
            color: #666;
            margin-bottom: 2rem;
            line-height: 1.6;
        }
        
        .requested-url {
            background: #f8f9fa;
            padding: 1rem;
            border-radius: 10px;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
            color: #495057;
            margin-bottom: 2rem;
            word-break: break-all;
        }
        
        .home-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 25px;
            font-weight: 500;
            transition: transform 0.2s ease;
        }
        
        .home-button:hover {
            transform: translateY(-2px);
        }
        
        .api-info {
            margin-top: 2rem;
            padding-top: 2rem;
            border-top: 1px solid #eee;
            font-size: 0.9rem;
            color: #888;
        }
        
        .api-endpoints {
            background: #f8f9fa;
            padding: 1rem;
            border-radius: 10px;
            margin-top: 1rem;
            text-align: left;
        }
        
        .api-endpoints h4 {
            margin-bottom: 0.5rem;
            color: #333;
        }
        
        .api-endpoints ul {
            list-style: none;
            padding-left: 0;
        }
        
        .api-endpoints li {
            padding: 0.25rem 0;
            font-family: 'Courier New', monospace;
            font-size: 0.8rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="error-code">404</div>
        <h1 class="error-title">Page Not Found</h1>
        <p class="error-message">
            Sorry, the page you're looking for doesn't exist. 
            The requested URL was not found on this server.
        </p>
        
        <div class="requested-url">
            <strong>Requested URL:</strong><br>
            ${requestedUrl}
        </div>
        
        <a href="/" class="home-button">Go to Homepage</a>

</body>
</html>
`;

export const getErrorHTML = (statusCode: number, message: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${statusCode} - Error</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #333;
        }
        
        .container {
            background: white;
            border-radius: 20px;
            padding: 3rem;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 500px;
            width: 90%;
        }
        
        .error-code {
            font-size: 6rem;
            font-weight: bold;
            color: #ff6b6b;
            line-height: 1;
            margin-bottom: 1rem;
        }
        
        .error-title {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 1rem;
            color: #333;
        }
        
        .error-message {
            font-size: 1rem;
            color: #666;
            margin-bottom: 2rem;
            line-height: 1.6;
        }
        
        .home-button {
            display: inline-block;
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 25px;
            font-weight: 500;
            transition: transform 0.2s ease;
        }
        
        .home-button:hover {
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="error-code">${statusCode}</div>
        <h1 class="error-title">Something went wrong</h1>
        <p class="error-message">${message}</p>
        <a href="/" class="home-button">Go to Homepage</a>
    </div>
</body>
</html>
`;

export const getWelcomeHTML = () => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Messenger</title>
  <style>
    body {
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Segoe UI', 'Roboto', Arial, sans-serif;
    }
    .welcome-container {
      background: rgba(24, 25, 26, 0.97);
      border-radius: 20px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.25);
      padding: 3em 2.5em 2.5em 2.5em;
      max-width: 400px;
      width: 100%;
      text-align: center;
      color: #fff;
      position: relative;
    }
    .logo {
      font-size: 2.5em;
      font-weight: 700;
      letter-spacing: 2px;
      margin-bottom: 0.3em;
      color: #8ab4f8;
      text-shadow: 0 2px 8px rgba(102,126,234,0.15);
    }
    .desc {
      font-size: 1.1em;
      color: #e4e6eb;
      margin-bottom: 2em;
      margin-top: 0.5em;
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 1.5em;
      margin-vertical: 2em;
    }

    .action-box {
      display: flex;
      flex-direction: column;
      gap: 0.5em;
    }

    .actions a {
      display: block;
      padding: 10px;
      border-radius: 8px;
      background: #667eea;
      color: #fff;
      font-size: 1.1em;
      font-weight: 500;
      text-decoration: none;
      box-shadow: 0 2px 8px rgba(102,126,234,0.10);
      transition: background 0.2s, transform 0.2s;
    }
    .actions a:hover {
      background: linear-gradient(90deg, #764ba2 60%, #667eea 100%);
      transform: translateY(-2px) scale(1.03);
    }

    .sub-desc {
      font-size: 0.9em;
      color: #cfcfcf;
      margin-top: -0.3em;
    }

    .footer {
      margin-top: 2em;
      font-size: 0.95em;
      color: #aaa;
    }
    @media (max-width: 600px) {
      .welcome-container {
        padding: 2em 1em 1.5em 1em;
        max-width: 98vw;
      }
      .logo {
        font-size: 2em;
      }
    }
  </style>
</head>
<body>
  <div class="welcome-container">
    <div class="logo">Messenger</div>
    <div class="desc">
      Welcome to your real-time Messenger app!<br>
      Chat instantly, securely, and beautifully.<br>
    </div>

    <div class="actions">

      <div class="action-box">
        <a href="/api-docs" target="_blank">API Documentation</a>
        <div class="sub-desc">View full backend API reference (Swagger UI).</div>
      </div>

      <div class="action-box">
        <a href="https://messaging-app-8bbd6.web.app/login.html" target="_blank">Demo Web App</a>
        <div class="sub-desc">Try the live demo version of the Messenger web app.</div>
      </div>

    </div>
    <div class="footer">
    <div>
    <span style="color:#8ab4f8;">Connect. Converse. Enjoy.</span>
    </div>
      &copy; <span id="year"></span> Messenger &mdash; Powered by Node.js, Express, MongoDB, Socket.IO
    </div>
  </div>

  <script>
    document.getElementById('year').textContent = new Date().getFullYear();
  </script>
</body>
</html>
`;
