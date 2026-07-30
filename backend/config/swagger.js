// const swaggerJsdoc = require('swagger-jsdoc');

// const options = {
//   definition: {
//     openapi: '3.0.0',
//     info: {
//       title: 'Blogbase API',
//       version: '1.0.0',
//       description: 'REST API documentation for Blogbase — a personal single-author article publishing platform',
//     },
//     servers: [
//       {
//         url: 'http://localhost:5000/api',
//         description: 'Development server',
//       },
//     ],
//     components: {
//       securitySchemes: {
//         bearerAuth: {
//           type: 'http',
//           scheme: 'bearer',
//           bearerFormat: 'JWT',
//         },
//       },
//       schemas: {
//         Article: {
//           type: 'object',
//           properties: {
//             _id: { type: 'string' },
//             title: { type: 'string' },
//             slug: { type: 'string' },
//             content: { type: 'string' },
//             excerpt: { type: 'string' },
//             coverImage: {
//               type: 'object',
//               properties: {
//                 url: { type: 'string' },
//                 publicId: { type: 'string' },
//               },
//             },
//             tag: { $ref: '#/components/schemas/Tag' },
//             isPublished: { type: 'boolean' },
//             publishedAt: { type: 'string', format: 'date-time' },
//             views: { type: 'number' },
//             likes: { type: 'number' },
//             dislikes: { type: 'number' },
//             shares: { type: 'number' },
//             createdAt: { type: 'string', format: 'date-time' },
//             updatedAt: { type: 'string', format: 'date-time' },
//           },
//         },
//         Tag: {
//           type: 'object',
//           properties: {
//             _id: { type: 'string' },
//             name: { type: 'string' },
//             slug: { type: 'string' },
//             isDefault: { type: 'boolean' },
//           },
//         },
//         Comment: {
//           type: 'object',
//           properties: {
//             _id: { type: 'string' },
//             article: { type: 'string' },
//             displayName: { type: 'string' },
//             content: { type: 'string' },
//             parentComment: { type: 'string', nullable: true },
//             isApproved: { type: 'boolean' },
//             isDeleted: { type: 'boolean' },
//             createdAt: { type: 'string', format: 'date-time' },
//           },
//         },
//         Subscriber: {
//           type: 'object',
//           properties: {
//             _id: { type: 'string' },
//             displayName: { type: 'string' },
//             email: { type: 'string' },
//             tags: {
//               type: 'array',
//               items: { $ref: '#/components/schemas/Tag' },
//             },
//             isActive: { type: 'boolean' },
//             createdAt: { type: 'string', format: 'date-time' },
//           },
//         },
//         Error: {
//           type: 'object',
//           properties: {
//             success: { type: 'boolean', example: false },
//             message: { type: 'string' },
//           },
//         },
//         Success: {
//           type: 'object',
//           properties: {
//             success: { type: 'boolean', example: true },
//             message: { type: 'string' },
//           },
//         },
//       },
//     },
//   },
//   apis: ['./routes/*.js'], // Swagger will read JSDoc comments from route files
// };

// const swaggerSpec = swaggerJsdoc(options);

// module.exports = swaggerSpec;