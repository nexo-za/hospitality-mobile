# Nexo POS System

A modern, responsive Point of Sale (POS) system built with React Native and Expo. The system is designed to work efficiently on both tablets and phones, with optimized layouts for each form factor and orientation.

## Features

### 1. Authentication & Security

- Simple login with username/password
- "Remember me" functionality for trusted devices
- Role-based access controls
- Secure token storage

### 2. Dashboard

- Clean, visual dashboard showing:
  - Today's sales total
  - Quick sale button
  - Recent transactions
  - End-of-day summary

### 3. Sales Process

- Visual product grid with images and prices
- Category filters for quick navigation
- Search functionality
- Barcode scanner integration
- Real-time cart management
- Multiple payment methods
- Receipt generation

### 4. Product Management

- Visual grid display of products
- Stock level tracking
- Category management
- Product performance indicators

### 5. Customer Management

- Customer directory with search
- Customer creation and editing
- Transaction history
- Direct messaging

### 6. Shift Management

- Shift controls (open/close)
- Cash reconciliation
- Basic shift reports
- Inventory counts

### 7. Offline Capabilities

- Full sales functionality during connectivity loss
- Local data storage
- Automatic background synchronization
- Conflict resolution

## Tech Stack

- **Framework**: React Native with Expo
- **Styling**: Tailwind React Native Classnames (twrnc)
- **API Integration**: Axios
- **State Management**: React Context API
- **Offline Storage**: AsyncStorage/SQLite
- **Authentication**: Token-based with SecureStore

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm start
   ```

3. Run on your device:
   - iOS: Press `i` in the terminal
   - Android: Press `a` in the terminal
   - Scan QR code with Expo Go app

## Project Structure

```
app/
  ├── (tabs)/           # Main tab navigation
  │   ├── index.tsx     # Dashboard
  │   ├── sales.tsx     # Sales screen
  │   ├── products.tsx  # Products management
  │   ├── customers.tsx # Customer management
  │   └── shifts.tsx    # Shift management
  ├── login.tsx         # Login screen
  └── _layout.tsx       # Root layout
components/             # Reusable components
contexts/              # React Context providers
styles/                # Global styles
```

## Development

### Adding New Features

1. Create new components in the `components` directory
2. Add new screens to the `app` directory
3. Update navigation in `app/_layout.tsx` if needed
4. Add new context providers in `contexts` if required

### Styling

The project uses Tailwind CSS for styling. Use the `tw` utility from `@/styles/tailwind`:

```typescript
import tw from "@/styles/tailwind";

// Example usage
<View style={tw`flex-1 bg-gray-100`}>
  <Text style={tw`text-xl font-bold`}>Hello World</Text>
</View>;
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

# Payment Process Fix

## Issue Fixed

Fixed a critical issue where card payments were being processed before stock validation, resulting in:
- Customer card being charged
- "Item not available" error appearing
- No items being sent to the backend
- Success UI showing and receipt printing

## Solution

1. Moved stock validation from the `handlePaymentComplete` function to the beginning of each payment method handler in the PaymentModal
2. Added a `validateStock` prop to the PaymentModal component to make this function available
3. This ensures stock validation happens BEFORE any payment is processed, not after

## Testing

After implementing this fix, the process will now:
1. Check stock availability before initiating any payment
2. Only process payments if all items are in stock
3. Show the appropriate error message if stock validation fails
4. Avoid charging cards when items are unavailable

## Technical Details

The core issue was a race condition where:
- The card payment was processed successfully
- Then stock validation checked availability
- If validation failed, backend API call was skipped
- But payment was already processed, creating data inconsistency

The fix ensures proper order of operations to maintain data integrity.
