# Biometric Helper Service

This C# application serves as a bridge between the Electron application and biometric devices.

## Setup Instructions

### Prerequisites
- .NET 6.0 or later
- Biometric device SDK (replace the sample implementation with actual SDK calls)

### Configuration
Set the following environment variables:
- `ELECTRON_API_URL`: URL of the Electron app's event endpoint (default: http://localhost:5006)
- `BIOMETRIC_HELPER_TOKEN`: Authentication token for secure communication

### Running the Service

```bash
dotnet run
```

The service will start on `http://localhost:5005`

### Integration with Actual Biometric SDK

1. Replace the `SampleBiometricDevice` class with your actual device implementation
2. Install the device SDK NuGet package
3. Implement the `IBiometricDevice` interface methods
4. Update the initialization and scanning logic

### API Endpoints

- `GET /api/biometric/status` - Check device status
- `GET /api/biometric/device-info` - Get device information
- `POST /api/biometric/start-scan` - Start fingerprint scanning
- `POST /api/biometric/stop-scan` - Stop fingerprint scanning
- `POST /api/biometric/enroll` - Enroll new fingerprint
- `DELETE /api/biometric/fingerprint/{memberId}` - Delete fingerprint

### Security Notes

- The service only listens on localhost for security
- Uses token-based authentication
- All communication with Electron app is over HTTP (consider HTTPS for production)

### Troubleshooting

1. Ensure the biometric device is connected and drivers are installed
2. Check that the device SDK is properly referenced
3. Verify that the Electron app is running and accepting connections
4. Check logs for any initialization errors
