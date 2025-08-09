import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import routes from './routes';
import { get404HTML, getErrorHTML, getWelcomeHTML } from './utils/htmlTemplates';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
dotenv.config();

const app = express();

// Security middleware
app.use(helmet());
app.use(compression());
// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);


const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Messenger API',
      version: '1.0.0',
    },
  },
  apis: ['./src/routes/*.ts'], 
};

const swaggerSpec = swaggerJsdoc(options);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:1500",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Routes
app.use('/v1/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  const acceptsHTML = req.accepts('html');
  if (acceptsHTML) {
    res.status(200).send(getWelcomeHTML());
  } else {
    res.status(200).json({ 
      success: true,
      message: 'Welcome to the Messenger API' 
    });
  }
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Error:', err.stack);
  
  // Check if the request expects HTML (browser request)
  const acceptsHTML = req.accepts('html');
  
  if (acceptsHTML) {
    res.status(500).send(getErrorHTML(500, 'Something went wrong!'));
  } else {
    res.status(500).json({ 
      success: false,
      error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!' 
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  // Check if the request expects HTML (browser request)
  const acceptsHTML = req.accepts('html');
  
  if (acceptsHTML) {
    res.status(404).send(get404HTML(req.originalUrl));
  } else {
    res.status(404).json({ 
      success: false,
      error: 'Route not found' 
    });
  }
});

export default app;
