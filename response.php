<?php
// Set headers to handle JSON and cross-origin requests
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // For CORS - adjust as needed
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');

// Start session for CSRF verification
session_start();

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
$pk = $data['pk'];

// Initialize variables for value processing
$value = isset($data['value']) ? $data['value'] : '';
$processedValue = $value; // Default to unprocessed value
$isHtmlContent = false;

// SECURITY ENHANCEMENT: Detect and handle HTML content vs regular content
// First, determine if this is HTML content by checking different signals
if (isset($data['htmlAllowed']) && $data['htmlAllowed'] === true) {
    $isHtmlContent = true;
} else if (isset($data['content']) && isset($data['htmlAllowed']) && $data['htmlAllowed'] === true) {
    $isHtmlContent = true;
    $value = $data['content']; // Use the special content field for HTML fields
} else if (is_string($value) && strpos($value, '{') === 0) {
    // The value might be a JSON string itself (from TextareaInput)
    $jsonValue = json_decode($value, true);
    if (json_last_error() === JSON_ERROR_NONE && isset($jsonValue['content']) && isset($jsonValue['htmlAllowed'])) {
        if ($jsonValue['htmlAllowed'] === true) {
            $isHtmlContent = true;
            $value = $jsonValue['content'];
            
            // Check CSRF token if provided
            if (isset($jsonValue['csrf_token'])) {
                if (!isset($_SESSION['csrf_token']) || $jsonValue['csrf_token'] !== $_SESSION['csrf_token']) {
                    // Log the CSRF failure
                    $csrfLog = "[$date] CSRF token validation failed\n";
                    file_put_contents($logFile, $csrfLog, FILE_APPEND);
                    
                    echo json_encode([
                        'status' => 'error',
                        'title' => 'Security Error',
                        'message' => 'Invalid security token'
                    ]);
                    exit;
                }
            }
        }
    }
}

// Process value based on content type (HTML or non-HTML)
if ($isHtmlContent) {
    // HTML content handling - sanitize HTML
    if (function_exists('htmlpurifier_load')) {
        // Use HTMLPurifier if available
        require_once 'path/to/htmlpurifier/library/HTMLPurifier.auto.php';
        
        $config = HTMLPurifier_Config::createDefault();
        $config->set('HTML.Allowed', 'p,br,b,i,u,ul,ol,li,strong,em');
        $config->set('HTML.MaxLength', 65535); // MySQL TEXT limit
        $config->set('CSS.AllowedProperties', 'font,font-size,font-weight,font-style,text-decoration');
        $config->set('AutoFormat.RemoveEmpty', true);
        
        $purifier = new HTMLPurifier($config);
        $processedValue = $purifier->purify($value);
        
        $sanitizeLog = "[$date] HTML content sanitized\n";
        file_put_contents($logFile, $sanitizeLog, FILE_APPEND);
    } else {
        // Basic sanitization if HTMLPurifier is not available
        $allowedTags = [
            '<p>', '</p>', '<br>', '<b>', '</b>', '<i>', '</i>', '<u>', '</u>', 
            '<ul>', '</ul>', '<ol>', '</ol>', '<li>', '</li>', 
            '<strong>', '</strong>', '<em>', '</em>'
        ];
        
        // First strip all tags
        $stripped = strip_tags($value, implode('', $allowedTags));
        // Then perform additional safety measures
        $processedValue = str_replace(['javascript:', 'onclick', 'onerror'], '', $stripped);
        
        $fallbackLog = "[$date] Fallback HTML sanitization used\n";
        file_put_contents($logFile, $fallbackLog, FILE_APPEND);
    }
} else {
    // Regular (non-HTML) content - escape HTML entities
    $processedValue = htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

// Field-specific validations (email, etc.)
if ($name === 'u_email' && !filter_var($processedValue, FILTER_VALIDATE_EMAIL)) {
    echo json_encode([
        'status' => 'error',
        'title' => 'Validation Error',
        'message' => 'Please enter a valid email address'
    ]);
    exit;
}

// Add current date/time and user info from the request
$currentDateTime = date('Y-m-d H:i:s');
$currentUser = isset($data['user']) ? $data['user'] : 'Unknown User';

// Example of recording the edit
$logMessage = "Field '$name' with ID '$pk' updated by $currentUser at $currentDateTime\n";
$logMessage .= "IsHTML: " . ($isHtmlContent ? "Yes" : "No") . "\n";
file_put_contents($logFile, $logMessage, FILE_APPEND);

// Database operations
$simulateSuccess = true; // Set to false to test error handling

// In a real application, you would use code like this:
/*
try {
    $pdo = new PDO("mysql:host=localhost;dbname=your_database", "username", "password", [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
    
    // Use different handling based on content type
    if ($isHtmlContent) {
        // Use specific HTML content table or column
        $stmt = $pdo->prepare("UPDATE html_content_table SET content = ?, updated_at = ?, updated_by = ? WHERE id = ?");
    } else {
        // Regular field - no HTML allowed
        $stmt = $pdo->prepare("UPDATE regular_data_table SET $name = ?, updated_at = ?, updated_by = ? WHERE id = ?");
    }
    
    $stmt->execute([$processedValue, $currentDateTime, $currentUser, $pk]);
    $simulateSuccess = true;
    
} catch (PDOException $e) {
    $simulateSuccess = false;
    $errorLog = "[$date] Database error: " . $e->getMessage() . "\n";
    file_put_contents($logFile, $errorLog, FILE_APPEND);
}
*/

// Return response
if ($simulateSuccess) {
    echo json_encode([
        'status' => 'success',
        'title' => 'Updated',
        'message' => "Successfully updated $name",
        'timestamp' => $currentDateTime,
        'user' => $currentUser,
        // Return the appropriate value based on content type
        'content' => $isHtmlContent ? $processedValue : null,
        'value' => !$isHtmlContent ? $processedValue : null
    ]);
} else {
    echo json_encode([
        'status' => 'error',
        'title' => 'Update Failed',
        'message' => "Could not update $name. Please try again."
    ]);
}
?>
