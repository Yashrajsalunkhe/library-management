using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace BiometricHelper
{
    // Models
    public class BiometricEvent
    {
        public string EventType { get; set; } = "";
        public int? MemberId { get; set; }
        public string FingerprintTemplate { get; set; } = "";
        public DateTime Timestamp { get; set; } = DateTime.Now;
        public string DeviceId { get; set; } = "";
        public bool Success { get; set; }
        public string Message { get; set; } = "";
    }

    public class EnrollRequest
    {
        public int MemberId { get; set; }
    }

    public class ApiResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = "";
        public object Data { get; set; }
    }

    // Biometric Device Interface (implement according to your device SDK)
    public interface IBiometricDevice
    {
        Task<bool> InitializeAsync();
        Task<bool> StartScanningAsync();
        Task<bool> StopScanningAsync();
        Task<BiometricEvent> EnrollFingerprintAsync(int memberId);
        Task<BiometricEvent> VerifyFingerprintAsync();
        Task<bool> DeleteFingerprintAsync(int memberId);
        Task<Dictionary<string, object>> GetDeviceInfoAsync();
        bool IsConnected { get; }
        event EventHandler<BiometricEvent> OnFingerprintScanned;
    }

    // Sample implementation - replace with actual device SDK calls
    public class SampleBiometricDevice : IBiometricDevice
    {
        private bool _isScanning = false;
        private readonly Random _random = new Random();
        private readonly Dictionary<int, string> _enrolledFingerprints = new();

        public bool IsConnected { get; private set; } = false;

        public event EventHandler<BiometricEvent> OnFingerprintScanned;

        public async Task<bool> InitializeAsync()
        {
            // Simulate device initialization
            await Task.Delay(1000);
            IsConnected = true;
            Console.WriteLine("Biometric device initialized");
            return true;
        }

        public async Task<bool> StartScanningAsync()
        {
            if (!IsConnected) return false;
            
            _isScanning = true;
            Console.WriteLine("Started fingerprint scanning");
            
            // Simulate periodic scans
            _ = Task.Run(async () =>
            {
                while (_isScanning)
                {
                    await Task.Delay(3000); // Scan every 3 seconds
                    
                    if (_isScanning && _random.Next(1, 10) > 7) // 30% chance of scan
                    {
                        await SimulateFingerprintScan();
                    }
                }
            });
            
            return true;
        }

        public async Task<bool> StopScanningAsync()
        {
            _isScanning = false;
            Console.WriteLine("Stopped fingerprint scanning");
            await Task.Delay(100);
            return true;
        }

        public async Task<BiometricEvent> EnrollFingerprintAsync(int memberId)
        {
            await Task.Delay(2000); // Simulate enrollment time
            
            var template = $"TEMPLATE_{memberId}_{Guid.NewGuid():N}";
            _enrolledFingerprints[memberId] = template;
            
            return new BiometricEvent
            {
                EventType = "ENROLLMENT",
                MemberId = memberId,
                FingerprintTemplate = template,
                Success = true,
                Message = "Fingerprint enrolled successfully"
            };
        }

        public async Task<BiometricEvent> VerifyFingerprintAsync()
        {
            await Task.Delay(1000); // Simulate verification time
            
            // Simulate random member verification
            if (_enrolledFingerprints.Count > 0 && _random.Next(1, 10) > 3)
            {
                var members = new List<int>(_enrolledFingerprints.Keys);
                var memberId = members[_random.Next(members.Count)];
                
                return new BiometricEvent
                {
                    EventType = "VERIFICATION",
                    MemberId = memberId,
                    Success = true,
                    Message = "Fingerprint verified successfully"
                };
            }
            
            return new BiometricEvent
            {
                EventType = "VERIFICATION",
                Success = false,
                Message = "Fingerprint not recognized"
            };
        }

        public async Task<bool> DeleteFingerprintAsync(int memberId)
        {
            await Task.Delay(500);
            _enrolledFingerprints.Remove(memberId);
            Console.WriteLine($"Deleted fingerprint for member {memberId}");
            return true;
        }

        public async Task<Dictionary<string, object>> GetDeviceInfoAsync()
        {
            await Task.Delay(200);
            return new Dictionary<string, object>
            {
                ["deviceName"] = "Sample Biometric Device",
                ["version"] = "1.0.0",
                ["manufacturer"] = "Sample Corp",
                ["serialNumber"] = "SMP12345",
                ["isConnected"] = IsConnected,
                ["enrolledCount"] = _enrolledFingerprints.Count
            };
        }

        private async Task SimulateFingerprintScan()
        {
            var result = await VerifyFingerprintAsync();
            OnFingerprintScanned?.Invoke(this, result);
        }
    }

    // Main service
    public class BiometricService
    {
        private readonly IBiometricDevice _device;
        private readonly HttpClient _httpClient;
        private readonly string _electronApiUrl;
        private readonly string _authToken;

        public BiometricService(IBiometricDevice device)
        {
            _device = device;
            _httpClient = new HttpClient();
            _electronApiUrl = Environment.GetEnvironmentVariable("ELECTRON_API_URL") ?? "http://localhost:5006";
            _authToken = Environment.GetEnvironmentVariable("BIOMETRIC_HELPER_TOKEN") ?? "default-token";
            
            _device.OnFingerprintScanned += OnFingerprintDetected;
        }

        public async Task InitializeAsync()
        {
            await _device.InitializeAsync();
        }

        private async void OnFingerprintDetected(object sender, BiometricEvent e)
        {
            Console.WriteLine($"Fingerprint detected: {e.EventType}, Member: {e.MemberId}, Success: {e.Success}");
            
            try
            {
                await SendEventToElectron(e);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error sending event to Electron: {ex.Message}");
            }
        }

        private async Task SendEventToElectron(BiometricEvent eventData)
        {
            try
            {
                var json = JsonSerializer.Serialize(eventData);
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                
                _httpClient.DefaultRequestHeaders.Clear();
                _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_authToken}");
                
                var response = await _httpClient.PostAsync($"{_electronApiUrl}/biometric-event", content);
                
                if (response.IsSuccessStatusCode)
                {
                    Console.WriteLine("Event sent to Electron successfully");
                }
                else
                {
                    Console.WriteLine($"Failed to send event to Electron: {response.StatusCode}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error sending event to Electron: {ex.Message}");
            }
        }

        public IBiometricDevice GetDevice() => _device;
    }

    // Web API Controllers
    public class Startup
    {
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddSingleton<IBiometricDevice, SampleBiometricDevice>();
            services.AddSingleton<BiometricService>();
            services.AddControllers();
            services.AddCors(options =>
            {
                options.AddDefaultPolicy(builder =>
                {
                    builder.WithOrigins("http://localhost:5006")
                           .AllowAnyMethod()
                           .AllowAnyHeader();
                });
            });
        }

        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }

            app.UseRouting();
            app.UseCors();
            
            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
            });

            // Initialize biometric service
            var biometricService = app.ApplicationServices.GetRequiredService<BiometricService>();
            _ = Task.Run(async () => await biometricService.InitializeAsync());
        }
    }

    // API Controller
    [Microsoft.AspNetCore.Mvc.ApiController]
    [Microsoft.AspNetCore.Mvc.Route("api/[controller]")]
    public class BiometricController : Microsoft.AspNetCore.Mvc.ControllerBase
    {
        private readonly BiometricService _biometricService;

        public BiometricController(BiometricService biometricService)
        {
            _biometricService = biometricService;
        }

        [Microsoft.AspNetCore.Mvc.HttpGet("status")]
        public async Task<ApiResponse> GetStatus()
        {
            var device = _biometricService.GetDevice();
            return new ApiResponse
            {
                Success = true,
                Data = new
                {
                    isConnected = device.IsConnected,
                    timestamp = DateTime.Now
                }
            };
        }

        [Microsoft.AspNetCore.Mvc.HttpGet("device-info")]
        public async Task<ApiResponse> GetDeviceInfo()
        {
            try
            {
                var device = _biometricService.GetDevice();
                var info = await device.GetDeviceInfoAsync();
                return new ApiResponse { Success = true, Data = info };
            }
            catch (Exception ex)
            {
                return new ApiResponse { Success = false, Message = ex.Message };
            }
        }

        [Microsoft.AspNetCore.Mvc.HttpPost("start-scan")]
        public async Task<ApiResponse> StartScanning()
        {
            try
            {
                var device = _biometricService.GetDevice();
                var result = await device.StartScanningAsync();
                return new ApiResponse 
                { 
                    Success = result, 
                    Message = result ? "Scanning started" : "Failed to start scanning" 
                };
            }
            catch (Exception ex)
            {
                return new ApiResponse { Success = false, Message = ex.Message };
            }
        }

        [Microsoft.AspNetCore.Mvc.HttpPost("stop-scan")]
        public async Task<ApiResponse> StopScanning()
        {
            try
            {
                var device = _biometricService.GetDevice();
                var result = await device.StopScanningAsync();
                return new ApiResponse 
                { 
                    Success = result, 
                    Message = result ? "Scanning stopped" : "Failed to stop scanning" 
                };
            }
            catch (Exception ex)
            {
                return new ApiResponse { Success = false, Message = ex.Message };
            }
        }

        [Microsoft.AspNetCore.Mvc.HttpPost("enroll")]
        public async Task<ApiResponse> EnrollFingerprint([Microsoft.AspNetCore.Mvc.FromBody] EnrollRequest request)
        {
            try
            {
                var device = _biometricService.GetDevice();
                var result = await device.EnrollFingerprintAsync(request.MemberId);
                return new ApiResponse 
                { 
                    Success = result.Success, 
                    Message = result.Message,
                    Data = result
                };
            }
            catch (Exception ex)
            {
                return new ApiResponse { Success = false, Message = ex.Message };
            }
        }

        [Microsoft.AspNetCore.Mvc.HttpDelete("fingerprint/{memberId}")]
        public async Task<ApiResponse> DeleteFingerprint(int memberId)
        {
            try
            {
                var device = _biometricService.GetDevice();
                var result = await device.DeleteFingerprintAsync(memberId);
                return new ApiResponse 
                { 
                    Success = result, 
                    Message = result ? "Fingerprint deleted" : "Failed to delete fingerprint" 
                };
            }
            catch (Exception ex)
            {
                return new ApiResponse { Success = false, Message = ex.Message };
            }
        }
    }

    // Main Program
    public class Program
    {
        public static async Task Main(string[] args)
        {
            Console.WriteLine("Starting Biometric Helper Service...");

            var host = Host.CreateDefaultBuilder(args)
                .ConfigureWebHostDefaults(webBuilder =>
                {
                    webBuilder.UseStartup<Startup>();
                    webBuilder.UseUrls("http://localhost:5005");
                })
                .Build();

            await host.RunAsync();
        }
    }
}
