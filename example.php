<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bootstrap 5 Editable JS - Complete Example</title>
    
    <!-- Bootstrap 5 CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <!-- Load Toastr CSS correctly -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/css/toastr.min.css" rel="stylesheet">
    
    <!-- Optional: Bootstrap Icons -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.8.0/font/bootstrap-icons.css" rel="stylesheet">
    
    <!-- CSRF Token placeholder - will be populated by PHP -->
    <meta name="csrf-token" content="<?php echo $_SESSION['csrf_token'] ?? ''; ?>">
    
    <style>
        .container { 
            max-width: 900px; 
            margin-top: 40px;
        }
        .editable-container { 
            max-width: 100%; 
        }
        .card { 
            margin-bottom: 20px; 
            box-shadow: 0 0.125rem 0.25rem rgba(0,0,0,0.075);
        }
        .html-editor { 
            min-height: 120px; 
        }
        .section-title {
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
            margin-bottom: 20px;
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
        .footer {
            margin-top: 60px;
            padding: 20px 0;
            text-align: center;
            font-size: 0.8rem;
            color: #6c757d;
            border-top: 1px solid #eee;
        }
        /* Add classes for icon buttons */
        .btn-icon {
            width: 32px;
            height: 32px;
            padding: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }
        /* Custom notification styles to replace toastr */
        .custom-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            max-width: 300px;
        }
    </style>
</head>
<body>
    <div class="container py-4">
        <h1 class="text-center mb-4">Bootstrap 5 Editable JS</h1>
        <p class="lead text-center mb-5">Secure in-place editing component with HTML and non-HTML field support</p>
        
        <!-- Basic Text Examples (Safe - No HTML) -->
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
                           data-pk="1" 
                           data-name="username" 
                           data-url="response.php" 
                           data-title="Enter username">
                            John Doe
                        </a>
                        <small class="form-text text-muted">Click to edit (popup mode)</small>
                    </div>
                </div>
                
                <!-- Text with HTML attempt (will be escaped) -->
                <div class="row mb-3 align-items-center">
                    <label class="col-sm-3 col-form-label">Status:</label>
                    <div class="col-sm-9">
                        <a href="#" 
                           id="status" 
                           data-editable="true" 
                           data-type="text" 
                           data-pk="1" 
                           data-name="status" 
                           data-url="response.php" 
                           data-mode="inline">
                            Available
                        </a>
                        <small class="form-text text-muted">Click to edit (inline mode) - try entering HTML like &lt;b&gt;text&lt;/b&gt;</small>
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
                           data-pk="1" 
                           data-name="u_email" 
                           data-url="response.php" 
                           data-title="Enter email">
                            john.doe@example.com
                        </a>
                        <small class="form-text text-muted">Server validates email format</small>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- HTML Rich Text Example -->
        <div class="card">
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
                    data-pk="1" 
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
            </div>
        </div>
        
        <!-- Select & Dropdown Examples -->
        <div class="card">
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
                           data-pk="1" 
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
                           data-pk="1" 
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
            </div>
        </div>
        
        <!-- Date and Time Inputs -->
        <div class="card">
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
                           data-pk="1" 
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
                           data-pk="1" 
                           data-name="meeting" 
                           data-url="response.php" 
                           data-title="Set meeting time">
                            2025-04-01 14:30
                        </a>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Numeric Inputs -->
        <div class="card">
            <div class="card-header bg-light">
                <h5 class="mb-0">Numeric Inputs <span class="badge security-safe security-badge">HTML Escaped</span></h5>
            </div>
            <div class="card-body">
                <!-- Number -->
                <div class="row mb-3 align-items-center">
                    <label class="col-sm-3 col-form-label">Age:</label>
                    <div class="col-sm-9">
                        <a href="#" 
                           id="age" 
                           data-editable="true" 
                           data-type="number" 
                           data-pk="1" 
                           data-name="age" 
                           data-url="response.php" 
                           data-title="Enter age"
                           data-min="18"
                           data-max="120">
                            35
                        </a>
                        <small class="form-text text-muted">With min/max validation (18-120)</small>
                    </div>
                </div>
                
                <!-- Range -->
                <div class="row mb-3 align-items-center">
                    <label class="col-sm-3 col-form-label">Satisfaction:</label>
                    <div class="col-sm-9">
                        <a href="#" 
                           id="satisfaction" 
                           data-editable="true" 
                           data-type="range" 
                           data-pk="1" 
                           data-name="satisfaction" 
                           data-url="response.php" 
                           data-title="Rate your satisfaction"
                           data-min="1"
                           data-max="10"
                           data-step="1">
                            8
                        </a>
                        <small class="form-text text-muted">Scale from 1-10</small>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p>Bootstrap 5 Editable JS | Last updated: 2025-04-01 05:56:38 by CashEncode</p>
        </div>
    </div>
    
    <!-- Bootstrap JS Bundle -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    
    <!-- Fix jQuery requirement for Toastr -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    
    <!-- Optional: Load Toastr JS correctly -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/js/toastr.min.js"></script>
    
    <!-- Custom notification replacement - ONLY as fallback -->
    <script>
        // Create a global notification system as backup for toastr
        window.customNotify = {
            // Create a notification element
            createNotification: function(type, title, message) {
                const notification = document.createElement('div');
                notification.className = `alert alert-${type} alert-dismissible fade show`;
                notification.style.position = 'fixed';
                notification.style.top = '20px';
                notification.style.right = '20px';
                notification.style.maxWidth = '300px';
                notification.style.zIndex = '9999';
                
                notification.innerHTML = `
                    <strong>${title}</strong> ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                `;
                return notification;
            },
            
            // Show a success notification
            success: function(message, title = 'Success!') {
                const notification = this.createNotification('success', title, message);
                document.body.appendChild(notification);
                setTimeout(() => notification.remove(), 5000);
            },
            
            // Show an error notification
            error: function(message, title = 'Error!') {
                const notification = this.createNotification('danger', title, message);
                document.body.appendChild(notification);
                setTimeout(() => notification.remove(), 5000);
            }
        };
        
        // Initialize toastr if available - or use our custom implementation as fallback
        document.addEventListener('DOMContentLoaded', function() {
            if (typeof jQuery !== 'undefined' && typeof toastr !== 'undefined') {
                // jQuery and Toastr are both available, configure Toastr
                toastr.options = {
                    closeButton: true,
                    progressBar: true,
                    positionClass: "toast-top-right",
                    timeOut: 3000
                };
                console.log('Toastr initialized successfully');
            } else {
                // Toastr not available, use our custom notification system
                console.log('Toastr not available, using fallback notifications');
                window.toastr = window.customNotify;
            }
        });
    </script>
    
    <!-- Bootstrap Editable JS -->
    <script src="index.js?cash=<?= time() ?>"></script>
    
    <!-- Event handling examples -->
    <script>
        // Event handling examples - WITHOUT triggering notifications
        document.addEventListener('DOMContentLoaded', function() {
            // Log events for debugging/demo purposes
            document.querySelectorAll('[data-editable="true"]').forEach(function(el) {
                el.addEventListener('editable:save', function(e) {
                    console.log('Saved:', e.detail);
                });
                
                el.addEventListener('editable:shown', function() {
                    console.log('Editor shown for:', el.id);
                });
                
                el.addEventListener('editable:hidden', function() {
                    console.log('Editor hidden for:', el.id);
                });
            });
            
            console.log('Editable elements initialized at 2025-04-01 05:56:38 by CashEncode');
        });
    </script>
</body>
</html>
