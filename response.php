<?php
// Set headers to handle JSON and cross-origin requests
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // For CORS - adjust as needed
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Log the request (optional)
$logFile = 'edit_log.txt';
$date = date('Y-m-d H:i:s');
$requestLog = "[$date] Request received\n";
file_put_contents($logFile, $requestLog, FILE_APPEND);

// For CORS preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Check if the request method is POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'status' => 'error',
        'title' => 'Method Not Allowed',
        'message' => 'Only POST requests are accepted'
    ]);
    exit;
}

// Get the content type
$contentType = isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : '';

// Initialize variables
$data = [];
$rawInput = '';

// Process data based on content type
if (strpos($contentType, 'application/json') !== false) {
    // Read from php://input for JSON data
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);
    
    // Check for JSON parsing errors
    if (json_last_error() !== JSON_ERROR_NONE) {
        echo json_encode([
            'status' => 'error',
            'title' => 'Invalid JSON',
            'message' => 'Could not parse JSON data: ' . json_last_error_msg()
        ]);
        exit;
    }
} else {
    // Use $_POST for form data
    $data = $_POST;
}

// Log received data
$dataLog = "[$date] Received data: " . print_r($data, true) . "\n";
file_put_contents($logFile, $dataLog, FILE_APPEND);

// Validate required fields
if (!isset($data['name']) || !isset($data['pk'])) {
    echo json_encode([
        'status' => 'error',
        'title' => 'Invalid Request',
        'message' => 'Missing required fields (name or pk)'
    ]);
    exit;
}

// Extract data
$name = $data['name'];
$value = isset($data['value']) ? $data['value'] : '';
$pk = $data['pk'];

// Just for the example: Validate email format if the field is email
if ($name === 'u_email' && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
    echo json_encode([
        'status' => 'error',
        'title' => 'Validation Error',
        'message' => 'Please enter a valid email address'
    ]);
    exit;
}

// Simulate database operation
// In a real application, you would save the data to your database here
$simulateSuccess = true;

// Add current date/time and user info from the request
$currentDateTime = date('Y-m-d H:i:s');
$currentUser = isset($data['user']) ? $data['user'] : 'Unknown User';

// Example of recording the edit
$logMessage = "Field '$name' with ID '$pk' updated to '$value' by $currentUser at $currentDateTime\n";
file_put_contents($logFile, $logMessage, FILE_APPEND);

// Return response
if ($simulateSuccess) {
    echo json_encode([
        'status' => 'success',
        'title' => 'Updated',
        'message' => "Successfully updated $name",
        'timestamp' => $currentDateTime,
        'user' => $currentUser
    ]);
} else {
    echo json_encode([
        'status' => 'error',
        'title' => 'Update Failed',
        'message' => "Could not update $name. Please try again."
    ]);
}
?>
