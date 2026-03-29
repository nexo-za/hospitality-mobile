## API Communication Setup

### Base URL

```
https://diy.neil.afrisight.work/api/
```

### Authentication

The app uses a combination of authentication methods:

1. Basic Authentication (Username/Password)
2. X-Auth-Token header

### Required Headers

```typescript
headers: {
  "Content-Type": "application/json",
  "Accept": "*/*",
  "X-Auth-Token": "YOUR_AUTH_TOKEN"
}
```

### Important API Endpoints

#### Authentication

- `login_user` - User login
- `verify_pin` - PIN verification
- `update_pin` - PIN update
- `validate_staff_id` - Staff validation

#### Shift Management

- `open_shift` - Open a new shift
- `close_shift` - Close an existing shift
- `get_user_shifts` - Get user's shift history
- `get_shift_by_store_id` - Get shift summary

#### Sales Management

- `create_sale` - Create new sale
- `refund_sale` - Process refunds
- `get_sales` - Get sales history
- `send_receipt` - Send receipt to customer

### Payment Processing

The app supports two payment types:

1. CASH
2. ECENTRIC (Card payments)

### File Uploads

The app supports file uploads for:

- Sale receipts
- Shift reports
- Refund documentation

Files are sent using `multipart/form-data` with the field name "files".

### Error Handling

Common error scenarios:

1. Authentication failures (401)
2. Validation errors (400)
3. Not found errors (404)
4. Server errors (500)

### Important Notes for Development

1. **Environment Setup**

   - Create a `.env` file with:
     ```
     AUTH_TOKEN=your_auth_token
     USER_NAME=your_username
     PASSWORD=your_password
     ```

2. **API Timeouts**

   - Default timeout: 10 seconds
   - Retry count: 1
   - Retry timeout: 0

3. **Data Validation**

   - All numeric IDs should be converted to numbers before sending
   - Dates should be in ISO format
   - Boolean values should be properly converted

4. **File Upload Guidelines**

   - Maximum 10 files per request
   - Supported formats: Images and PDFs
   - Maximum file size: Check backend limits

### Common Issues and Solutions

1. **Authentication Failures**

   - Verify AUTH_TOKEN is valid
   - Check username/password credentials
   - Ensure headers are properly set

### Development Tools

1. **API Testing**

   - Use Postman or similar tools for API testing
   - Create a collection with all endpoints
   - Include example requests and responses

2. **Type Definitions**

   - All API types are defined in `/data-intergation-plan/apiTypes.ts`
   - Use these types for type safety
   - Keep types in sync with backend changes

3. **Network Layer**
   - Uses Axios for HTTP requests
   - Implements retry mechanism
   - Handles file uploads

### Security Considerations

1. **Authentication**

   - Store sensitive data securely
   - Use secure storage for tokens
   - Implement proper session management

2. **Data Transmission**

   - Use HTTPS for all requests
   - Validate all incoming data
   - Sanitize user inputs

3. **File Handling**
   - Validate file types
   - Implement size limits
   - Scan for malware
