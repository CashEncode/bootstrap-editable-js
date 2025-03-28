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
$value = isset($data['value']) ? $data['value'] : '';
$pk = $data['pk'];

// Initialize sanitized content variable
$sanitizedContent = $value;

// CSRF verification for HTML content
if (isset($data['value']) && is_string($data['value']) && 
    (strpos($data['value'], '{') === 0) && (strpos($data['value'], '}') === strlen($data['value']) - 1)) {
    // Attempt to parse value as JSON
    $jsonData = json_decode($data['value'], true);
    
    if (json_last_error() === JSON_ERROR_NONE && isset($jsonData['content'])) {
        // We have a structured content submission from TextareaInput
        
        // Verify CSRF token if provided
        if (isset($jsonData['csrf_token'])) {
            if (!isset($_SESSION['csrf_token']) || $jsonData['csrf_token'] !== $_SESSION['csrf_token']) {
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
        
        // Extract the HTML content
        $htmlContent = $jsonData['content'];
        
        // Load HTMLPurifier if available
        if (file_exists('path/to/htmlpurifier/library/HTMLPurifier.auto.php')) {
            require_once 'path/to/htmlpurifier/library/HTMLPurifier.auto.php';
            
            $config = HTMLPurifier_Config::createDefault();
            $config->set('HTML.Allowed', 'p,br,b,i,u,ul,ol,li,strong,em');
            $config->set('HTML.MaxLength', 65535); // MySQL TEXT limit
            $config->set('CSS.AllowedProperties', 'font,font-size,font-weight,font-style,text-decoration');
            $config->set('AutoFormat.RemoveEmpty', true);
            
            $purifier = new HTMLPurifier($config);
            $sanitizedContent = $purifier->purify($htmlContent);
            
            // Log the sanitization
            $sanitizeLog = "[$date] HTML content sanitized\n";
            file_put_contents($logFile, $sanitizeLog, FILE_APPEND);
        } else {
            // Fallback basic sanitization if HTMLPurifier is not available
            $sanitizedContent = strip_tags($htmlContent, '<p><br><b><i><u><ul><ol><li><strong><em>');
            
            // Log fallback sanitization
            $fallbackLog = "[$date] Fallback sanitization used (HTMLPurifier not available)\n";
            file_put_contents($logFile, $fallbackLog, FILE_APPEND);
        }
        
        // Update value for further processing
        $value = $sanitizedContent;
    }
}

// Field-specific validations
if ($name === 'user_email' && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
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
    
    // Determine if this is HTML content based on the field name or other criteria
    $isHtmlContent = (strpos($name, 'html_') === 0 || $name === 'description' || $name === 'content');
    
    if ($isHtmlContent) {
        // Insert/update HTML content
        $stmt = $pdo->prepare("UPDATE content_table SET html_content = ?, updated_at = ?, updated_by = ? WHERE id = ?");
        $stmt->execute([$sanitizedContent, $currentDateTime, $currentUser, $pk]);
    } else {
        // Handle regular fields
        $stmt = $pdo->prepare("UPDATE your_table SET $name = ?, updated_at = ?, updated_by = ? WHERE id = ?");
        $stmt->execute([$value, $currentDateTime, $currentUser, $pk]);
    }
    
    $simulateSuccess = true;
    
} catch (PDOException $e) {
    $simulateSuccess = false;
    // Log the real error (don't expose in response)
    error_log('Database error: ' . $e->getMessage());
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
        'content' => $sanitizedContent // Return sanitized content for HTML fields
    ]);
} else {
    echo json_encode([
        'status' => 'error',
        'title' => 'Update Failed',
        'message' => "Could not update $name. Please try again."
    ]);
}
?>
