<?php
// Start session for CSRF protection
session_start();

// Generate a CSRF token if one doesn't exist
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// Current timestamp and user (provided by you)
$current_timestamp = "2025-04-01 06:30:13";
$current_user = "CashEncode";

$pk = 1;
$pk2 = 2;
$pk3 = 3;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bootstrap 5 Editable JS - Complete Example</title>
    
    <!-- Bootstrap 5 CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <!-- Load Toastr CSS -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/css/toastr.min.css" rel="stylesheet">
    
    <!-- Bootstrap Icons -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.8.0/font/bootstrap-icons.css" rel="stylesheet">
    
    <!-- CSRF Token -->
    <meta name="csrf-token" content="<?php echo $_SESSION['csrf_token']; ?>">
    
    <style>
        .container { 
            max-width: 900px; 
            margin-top: 40px;
        }
        .card { 
            margin-bottom: 20px; 
            box-shadow: 0 0.125rem 0.25rem rgba(0,0,0,0.075);
        }
        .html-editor { 
            min-height: 120px; 
        }
        .security-badge {
            font-size: 0.7rem;
            vertical-align: super;
            margin-left: 5px;
        }
        .security-html {
            background-color: #F9C5D1;
            color: #8B0000;
        }
        .security-safe {
            background-color: #C5F9C7;
            color: #006400;
        }
        .demo-section {
            margin-bottom: 40px;
        }
        .section-header {
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .footer {
            margin-top: 60px;
            padding: 20px 0;
            text-align: center;
            font-size: 0.8rem;
            color: #6c757d;
            border-top: 1px solid #eee;
        }
        .btn-icon {
            width: 32px;
            height: 32px;
            padding: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }
        code {
            background-color: #f8f9fa;
            padding: 2px 4px;
            border-radius: 4px;
            color: #d63384;
        }
        .code-block {
            background-color: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 15px;
            border-left: 3px solid #0d6efd;
            font-family: monospace;
            white-space: pre-wrap;
        }
    </style>
</head>
<body>
    <div class="container py-4">
        <h1 class="text-center mb-2">Bootstrap 5 Editable JS</h1>
        <p class="lead text-center mb-5">Complete example with HTML data attributes and JavaScript initialization</p>
        
        <!-- DATA ATTRIBUTE INITIALIZATION -->
        <div class="demo-section">
            <h2 class="section-header">1. HTML Data Attribute Initialization</h2>
            <p class="mb-4">Fields initialized with <code>data-editable="true"</code> and other data attributes.</p>
            
            <!-- Basic Text Examples -->
            <div class="card">
                <div class="card-header bg-light">
                    <h5 class="mb-0">Text Inputs <span class="badge security-safe security-badge">HTML Escaped</span></h5>
                </div>
                <div class="card-body">
                    <!-- Regular Text (Popup Mode) -->
                    <div class="row mb-3 align-items-center">
                        <label class="col-sm-3 col-form-label">Name:</label>
                        <div class="col-sm-9">
                            <a href="#" 
                               id="username" 
                               data-editable="true" 
                               data-type="text" 
                               data-pk="<?= $pk; ?>" 
                               data-name="username" 
                               data-url="response.php" 
                               data-title="Enter username">
                                John Doe
                            </a>
                            <small class="form-text text-muted">Click to edit (popup mode)</small>
                        </div>
                    </div>
                    
                    <!-- Text with inline mode -->
                    <div class="row mb-3 align-items-center">
                        <label class="col-sm-3 col-form-label">Status:</label>
                        <div class="col-sm-9">
                            <a href="#" 
                               id="status" 
                               data-editable="true" 
                               data-type="text" 
                               data-pk="<?= $pk; ?>" 
                               data-name="status" 
                               data-url="response.php" 
                               data-mode="inline">
                                Available
                            </a>
                            <small class="form-text text-muted">Click to edit (inline mode)</small>
                        </div>
                    </div>
                    
                    <!-- Email Input (with validation) -->
                    <div class="row mb-3 align-items-center">
                        <label class="col-sm-3 col-form-label">Email:</label>
                        <div class="col-sm-9">
                            <a href="#" 
                               id="email" 
                               data-editable="true" 
                               data-type="email" 
                               data-pk="<?= $pk; ?>" 
                               data-name="u_email" 
                               data-url="response.php" 
                               data-title="Enter email">
                                john.doe@example.com
                            </a>
                            <small class="form-text text-muted">Server validates email format</small>
                        </div>
                    </div>
                    
                    <div class="code-block">data-editable="true"
data-type="text|email"
data-pk="<?= $pk; ?>"
data-name="fieldname"
data-url="response.php"
data-mode="popup|inline" // optional</div>
                </div>
            </div>
            
            <!-- HTML Rich Text Example -->
            <div class="card mt-4">
                <div class="card-header bg-light">
                    <h5 class="mb-0">Rich Text Editor <span class="badge security-html security-badge">HTML Sanitized</span></h5>
                </div>
                <div class="card-body">
                    <p class="card-text mb-3">This editor allows safe HTML tags but sanitizes dangerous content:</p>
                    
                    <!-- HTML TextareaInput -->
                    <div 
                        id="html-content" 
                        data-editable="true" 
                        data-type="textarea" 
                        data-pk="<?= $pk; ?>" 
                        data-name="html_content" 
                        data-url="response.php" 
                        data-title="Edit content" 
                        data-showbuttons="bottom"
                        data-showtoolbar="true"
                        data-placeholder="Click to edit rich text content">
                        <p>This is <b>formatted</b> content with <i>styling</i> options.</p>
                        <p>You can add:</p>
                        <ul>
                            <li>Bullet points</li>
                            <li>With <strong>formatting</strong></li>
                        </ul>
                    </div>
                    <small class="form-text text-muted mt-2">HTML is sanitized but preserved for rendering</small>
                    
                    <div class="code-block">data-editable="true"
data-type="textarea"
data-showbuttons="bottom"
data-showtoolbar="true"</div>
                </div>
            </div>
            
            <!-- Select & Dropdown Examples -->
            <div class="card mt-4">
                <div class="card-header bg-light">
                    <h5 class="mb-0">Select Inputs <span class="badge security-safe security-badge">HTML Escaped</span></h5>
                </div>
                <div class="card-body">
                    <!-- Single Select -->
                    <div class="row mb-4 align-items-center">
                        <label class="col-sm-3 col-form-label">Country:</label>
                        <div class="col-sm-9">
                            <a href="#" 
                               id="country" 
                               data-editable="true" 
                               data-type="select" 
                               data-pk="<?= $pk; ?>" 
                               data-name="country" 
                               data-url="response.php" 
                               data-title="Select country"
                               data-source='{"US":"United States","CA":"Canada","UK":"United Kingdom","AU":"Australia"}'>
                                United States
                            </a>
                            <small class="form-text text-muted">Options from simple JSON source</small>
                        </div>
                    </div>
                    
                    <!-- Checklist -->
                    <div class="row mb-3 align-items-center">
                        <label class="col-sm-3 col-form-label">Languages:</label>
                        <div class="col-sm-9">
                            <a href="#" 
                               id="languages" 
                               data-editable="true" 
                               data-type="checklist" 
                               data-pk="<?= $pk; ?>" 
                               data-name="languages" 
                               data-url="response.php" 
                               data-title="Select languages"
                               data-source='[
                                   {"value":"en","text":"English"},
                                   {"value":"fr","text":"French"},
                                   {"value":"es","text":"Spanish"},
                                   {"value":"de","text":"German"}
                               ]'
                               data-value='["en","es"]'>
                                English, Spanish
                            </a>
                            <small class="form-text text-muted">Multiple selection with checklist</small>
                        </div>
                    </div>
                    
                    <div class="code-block">data-type="select"
data-source='{"value":"text", "value2":"text2"}'

data-type="checklist"
data-source='[{"value":"val1", "text":"text1"}]'
data-value='["val1","val2"]'</div>
                </div>
            </div>
            
            <!-- Date and Time Inputs -->
            <div class="card mt-4">
                <div class="card-header bg-light">
                    <h5 class="mb-0">Date & Time Inputs <span class="badge security-safe security-badge">HTML Escaped</span></h5>
                </div>
                <div class="card-body">
                    <!-- Date -->
                    <div class="row mb-3 align-items-center">
                        <label class="col-sm-3 col-form-label">Birthdate:</label>
                        <div class="col-sm-9">
                            <a href="#" 
                               id="birthdate" 
                               data-editable="true" 
                               data-type="date" 
                               data-pk="<?= $pk; ?>" 
                               data-name="birthdate" 
                               data-url="response.php" 
                               data-title="Enter birthdate">
                                1990-01-15
                            </a>
                        </div>
                    </div>
                    
                    <!-- DateTime -->
                    <div class="row mb-3 align-items-center">
                        <label class="col-sm-3 col-form-label">Meeting Time:</label>
                        <div class="col-sm-9">
                            <a href="#" 
                               id="meeting" 
                               data-editable="true" 
                               data-type="datetime-local" 
                               data-pk="<?= $pk; ?>" 
                               data-name="meeting" 
                               data-url="response.php" 
                               data-title="Set meeting time">
                                2025-04-01 14:30
                            </a>
                        </div>
                    </div>
                    
                    <div class="code-block">data-type="date"
data-type="datetime-local"</div>
                </div>
            </div>
        </div>
        
        <!-- JAVASCRIPT INITIALIZATION -->
        <div class="demo-section">
            <h2 class="section-header">2. JavaScript Initialization</h2>
            <p class="mb-4">Fields initialized programmatically with JavaScript API.</p>
            
            <div class="card">
                <div class="card-header bg-light">
                    <h5 class="mb-0">JavaScript API Examples</h5>
                </div>
                <div class="card-body">
                    <!-- Simple text with JS init -->
                    <div class="row mb-3 align-items-center">
                        <label class="col-sm-3 col-form-label">Title:</label>
                        <div class="col-sm-9">
                            <a href="#" id="js-title">Product Manager</a>
                            <small class="form-text text-muted">Initialized with JS API</small>
                        </div>
                    </div>
                    
                    <!-- URL set via JS -->
                    <div class="row mb-3 align-items-center">
                        <label class="col-sm-3 col-form-label">Department:</label>
                        <div class="col-sm-9">
                            <a href="#" id="js-department">Engineering</a>
                            <small class="form-text text-muted">URL set dynamically with parameters</small>
                        </div>
                    </div>
                    
                    <!-- HTML with JS initialization -->
                    <div class="row mb-3 align-items-center">
                        <label class="col-sm-3 col-form-label">Bio:</label>
                        <div class="col-sm-9">
                            <div id="js-bio">
                                <p>Experienced software engineer with a passion for UI development.</p>
                            </div>
                            <small class="form-text text-muted">Rich text initialized with JS</small>
                        </div>
                    </div>
                    
                    <div class="code-block">// Basic JS initialization
editable('#js-title', {
    type: 'text',
    pk: <?= $pk2; ?>,
    name: 'title',
    url: 'response.php',
    title: 'Enter title'
});

// Dynamic URL with parameters
const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
const timestamp = new Date().toISOString();
const url = `response.php?token=${csrfToken}&t=${timestamp}`;

editable('#js-department', {
    url: url,
    // other options...
});</div>
                </div>
            </div>
            
            <!-- Advanced features -->
            <div class="card mt-4">
                <div class="card-header bg-light">
                    <h5 class="mb-0">Advanced Features</h5>
                </div>
                <div class="card-body">
                    <!-- With validation -->
                    <div class="row mb-3 align-items-center">
                        <label class="col-sm-3 col-form-label">Username:</label>
                        <div class="col-sm-9">
                            <a href="#" id="username-validated">cashbookapp</a>
                            <small class="form-text text-muted">With client-side validation (min 4 chars)</small>
                        </div>
                    </div>
                    
                    <!-- With auto-submit -->
                    <div class="row mb-3 align-items-center">
                        <label class="col-sm-3 col-form-label">Notifications:</label>
                        <div class="col-sm-9">
                            <a href="#" id="notifications">Important only</a>
                            <small class="form-text text-muted">Auto-submits on change (no buttons)</small>
                        </div>
                    </div>
                    
                    <!-- With event listeners -->
                    <div class="row mb-3 align-items-center">
                        <label class="col-sm-3 col-form-label">Theme:</label>
                        <div class="col-sm-9">
                            <a href="#" id="theme">Light</a>
                            <small class="form-text text-muted">With event listeners for save/cancel</small>
                        </div>
                    </div>
                    
                    <div class="code-block">// With validation
editable('#username-validated', {
    validate: function(value) {
        if(value.length < 4) return 'Username must be 4+ characters';
    }
});

// With auto-submit
editable('#notifications', {
    autosubmit: true,
    showbuttons: false
});

// With event listeners
document.querySelector('#theme').addEventListener('editable:save', 
  function(e) {
    console.log('Saved:', e.detail);
  });</div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p>Bootstrap 5 Editable JS | Last updated: <?php echo $current_timestamp; ?> by <?php echo $current_user; ?></p>
        </div>
    </div>
    
    <!-- Bootstrap JS Bundle -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    
    <!-- jQuery (for Toastr) -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    
    <!-- Toastr JS -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/js/toastr.min.js"></script>
    
    <!-- Initialize Toastr -->
    <script>
        // Initialize toastr if available
        document.addEventListener('DOMContentLoaded', function() {
            if (typeof jQuery !== 'undefined' && typeof toastr !== 'undefined') {
                toastr.options = {
                    closeButton: true,
                    progressBar: true,
                    positionClass: "toast-top-right",
                    timeOut: 3000
                };
                console.log('Toastr initialized successfully');
            } else {
                console.log('Toastr not available, notifications may be limited');
                // Simple fallback
                window.toastr = {
                    success: function(message) { console.log('Success:', message); },
                    error: function(message) { console.log('Error:', message); }
                };
            }
        });
    </script>
    
    <!-- Bootstrap Editable JS -->
    <script src="index.js"></script>
    
    <!-- JavaScript Initialization Examples -->
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Current timestamp and CSRF token
            const timestamp = "<?php echo $current_timestamp; ?>";
            const user = "<?php echo $current_user; ?>";
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            
            // Basic URL
            const baseUrl = 'response.php';
            
            // --------------------------------------------------
            // JavaScript initialization examples
            // --------------------------------------------------
            
            // Basic JS initialization
            window.editable('#js-title', {
                type: 'text',
                pk: <?= $pk2; ?>,
                name: 'title',
                url: baseUrl,
                title: 'Enter title'
            });
            
            // Dynamic URL with parameters
            const dynamicUrl = `${baseUrl}?csrf=${encodeURIComponent(csrfToken)}&timestamp=${encodeURIComponent(timestamp)}&user=${encodeURIComponent(user)}`;
            
            window.editable('#js-department', {
                type: 'text',
                pk: <?= $pk2; ?>,
                name: 'department',
                url: dynamicUrl,
                title: 'Select Department',
                mode: 'popup'
            });
            
            // HTML content with rich text editor
            window.editable('#js-bio', {
                type: 'textarea',
                pk: <?= $pk2; ?>,
                name: 'bio',
                url: baseUrl,
                title: 'Edit Bio',
                showbuttons: 'bottom',
                showtoolbar: true,
                placement: 'top'
            });
            
            // --------------------------------------------------
            // Advanced examples
            // --------------------------------------------------
            
            // With validation
            window.editable('#username-validated', {
                type: 'text',
                pk: <?= $pk3; ?>,
                name: 'username_validated',
                url: baseUrl,
                title: 'Enter username (min 4 chars)',
                validate: function(value) {
                    if (value.length < 4) {
                        return 'Username must be at least 4 characters long';
                    }
                }
            });
            
            // With auto-submit
            window.editable('#notifications', {
                type: 'select',
                pk: <?= $pk3; ?>,
                name: 'notifications',
                url: baseUrl,
                title: 'Notification settings',
                source: {
                    'all': 'All notifications',
                    'important': 'Important only',
                    'none': 'None'
                },
                autosubmit: true,
                showbuttons: false
            });
            
            // With event listeners
            window.editable('#theme', {
                type: 'select',
                pk: <?= $pk3; ?>,
                name: 'theme',
                url: baseUrl,
                title: 'Select theme',
                source: {
                    'light': 'Light',
                    'dark': 'Dark',
                    'auto': 'Auto (system)'
                }
            });
            
            // Add event listeners for the theme element
            document.getElementById('theme').addEventListener('editable:save', function(e) {
                console.log('Theme changed:', e.detail);
                
                // Example of custom actions on save
                const newTheme = e.detail.newValue;
                if (newTheme === 'dark') {
                    document.body.classList.add('bg-dark');
                    document.body.classList.add('text-light');
                } else {
                    document.body.classList.remove('bg-dark');
                    document.body.classList.remove('text-light');
                }
            });
            
            // Event handling for all editable elements
            document.querySelectorAll('[data-editable="true"], #js-title, #js-department, #js-bio, #username-validated, #notifications, #theme').forEach(function(el) {
                el.addEventListener('editable:shown', function() {
                    console.log('Editor shown for:', el.id || 'unnamed element');
                });
                
                el.addEventListener('editable:hidden', function() {
                    console.log('Editor hidden for:', el.id || 'unnamed element');
                });
            });
            
            console.log(`All editable elements initialized at ${timestamp} by ${user}`);
        });
    </script>
</body>
</html>
