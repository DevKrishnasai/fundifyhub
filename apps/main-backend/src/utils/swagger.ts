import swaggerJsdoc from 'swagger-jsdoc';
import config from './config';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FundifyHub API Documentation',
      version: '1.0.0',
      description: 'API documentation for FundifyHub backend service',
      contact: {
        name: 'FundifyHub Support',
        email: 'support@fundifyhub.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.server.port}/api/v1`,
        description: 'Development Server',
      },
      {
        url: 'https://api.fundifyhub.com/api/v1',
        description: 'Production Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Error message description',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './src/api/health/*.ts',
    './src/api/auth/*.ts',
    './src/api/user/*.ts',
    './src/api/requests/*.ts',
    // Add other route paths as needed
  ],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
