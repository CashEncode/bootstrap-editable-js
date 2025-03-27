/**
 * Bootstrap 5 Editable
 * In-place editing with Bootstrap 5 (pure JavaScript implementation)
 */
(function() {
    'use strict';
    /**
     * Main Editable class
     */
    const defaults = {
        type: 'text',         // Input type
        pk: null,             // Primary key
        name: null,           // Field name
        value: null,          // Initial value
        url: null,            // URL for submit
        params: {},           // Additional params for submit
        placement: 'top',     // Placement of popover
        title: '',            // Title text
        mode: 'popup',        // Mode: popup or inline
        showbuttons: true,    // Show submit/cancel buttons
        defaultValue: null,   // Default value if input is empty
        validate: null,       // Validate function
        success: null,        // Success callback
        error: null,          // Error callback
        emptytext: 'Empty',   // Text when value is empty
        savenochange: false,  // Save if value not changed
        autosubmit: false,    // Auto-submit when input changed
        onblur: null,         // On blur behavior: 'cancel', 'submit', 'ignore'

        // Cleanup options
        cleanupOnSave: true,    // Clean up DOM elements after successful save
        cleanupOnCancel: true,  // Clean up DOM elements after cancel
        cleanupOnHide: false    // Clean up container on hide (careful with this one)
    };
    
    class Editable {
        constructor(element, options = {}) {
            // Store element
            this.element = element;

            // Merge default options with provided options
            this.options = {
                ...defaults,
                ...options
            };

            // Store current date and user for logging
            this.options.timestamp = '2025-03-27 03:03:23';
            this.options.user = 'CashEncode';

            // Initialize
            this.init();
        }

        init() {
            if (!this.element) return;

            // Add editable class
            this.element.classList.add('editable');

            // Store reference to editable instance
            this.element.editable = this;

            // Set up click handler
            this._setupClickHandler();

            console.log(`Editable initialized at ${this.options.timestamp} by ${this.options.user}`);
        }

        _setupClickHandler() {
            if (!this.element) return;

            // Remove any existing click handler first
            if (this._clickHandler) {
                this.element.removeEventListener('click', this._clickHandler);
            }

            // Create a fresh click handler
            this._clickHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();

                // If already open, do nothing
                if (this.element.classList.contains('editable-open')) {
                    return;
                }

                this.show();
            };

            // Add the click handler
            this.element.addEventListener('click', this._clickHandler);
        }

        show() {
            if (!this.element) return;

            // Add open class
            this.element.classList.add('editable-open');

            // Create container if needed
            if (!this.container) {
                this._createContainer();
            }

            // Create form if needed
            if (!this.form) {
                this._createForm();
            }

            // Create input if needed
            if (!this.input) {
                this._createInput();
            }

            // Show container
            if (this.container) {
                this.container.show();
            }

            // Trigger shown event
            this.triggerEvent('shown');

            console.log(`Editable shown at ${this.options.timestamp} by ${this.options.user}`);
        }

        _createContainer() {
            // Create container based on mode
            if (this.options.mode === 'popup') {
                this.container = new PopoverContainer(this, this.options);
            } else if (this.options.mode === 'inline') {
                this.container = new InlineContainer(this, this.options);
            }
        }

        _createForm() {
            // Create form component
            this.form = new EditableForm(this);
        }

        _createInput() {
            // Create input based on type
            const type = this.options.type || 'text';

            switch (type) {
                case 'textarea':
                    this.input = new TextareaInput(this, this.options);
                    break;
                case 'select':
                    this.input = new SelectInput(this, this.options);
                    break;
                // Add other input types as needed
                default:
                    this.input = new TextInput(this, this.options);
            }
        }

        hide() {
            if (!this.element) return;

            // Remove open class
            this.element.classList.remove('editable-open');

            // Clear any errors
            if (this.form && typeof this.form.clearError === 'function') {
                this.form.clearError();
            }

            // Hide container
            if (this.container) {
                this.container.hide();
            }

            // Trigger hidden event
            this.triggerEvent('hidden');

            console.log(`Editable hidden at ${this.options.timestamp} by ${this.options.user}`);
        }

        /**
         * Soft cleanup that preserves the editable functionality
         */
        softCleanup() {
            console.log(`Soft cleanup at ${this.options.timestamp} by ${this.options.user}`);

            // Clean form content if it exists
            if (this.form) {
                // Just reset the error container
                if (typeof this.form.clearError === 'function') {
                    this.form.clearError();
                }

                // Don't destroy the form, will be recreated on next show
                this.form = null;
            }

            // Release input
            this.input = null;

            // Clean container content but preserve the container
            if (this.container) {
                // Empty the content but keep the container
                this.container.emptyContent();
            }
        }

        cancel() {
            // Hide first
            this.hide();

            // Perform soft cleanup on cancel
            if (this.options.cleanupOnCancel) {
                this.softCleanup();
            }

            // Trigger cancel event
            this.triggerEvent('cancel');

            console.log(`Edit canceled at ${this.options.timestamp} by ${this.options.user}`);
        }

        save(value) {
            const previousValue = this.options.value;
            this.options.value = value;

            // Skip saving if value not changed
            if (!this.options.savenochange &&
                JSON.stringify(previousValue) === JSON.stringify(value)) {
                this.triggerEvent('nochange');
                this.hide();
                return;
            }

            // Convert value for submit
            const submitValue = this.input.value2submit(value);

            // Implement sending logic
            if (this.options.url) {
                // Show loading state
                this.container.showLoading();

                const pk = typeof this.options.pk === 'function' ?
                    this.options.pk() : this.options.pk;

                // Prepare data with user and timestamp
                let data = {
                    name: this.options.name || '',
                    value: submitValue,
                    pk: pk,
                    timestamp: this.options.timestamp,
                    user: this.options.user
                };

                // Add additional params
                if (typeof this.options.params === 'function') {
                    data = {
                        ...data,
                        ...this.options.params(data)
                    };
                } else {
                    data = {
                        ...data,
                        ...this.options.params
                    };
                }

                // Prepare request options
                const ajaxOptions = {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data),
                    ...this.options.ajaxOptions
                };

                // Send data
                fetch(this.options.url, ajaxOptions)
                    .then(response => {
                        // Check if the response is ok
                        if (!response.ok) {
                            const error = new Error(`Server returned ${response.status}: ${response.statusText}`);
                            error.status = response.status;
                            error.response = response;
                            throw error;
                        }
                        return response.json();
                    })
                    .then(responseData => {
                        this.container.hideLoading();

                        // Handle the response based on the status field
                        if (responseData && responseData.status) {
                            if (responseData.status === "error") {
                                // Show error message in the form
                                if (this.form && typeof this.form.error === 'function') {
                                    this.form.error(responseData.message || "Unknown error occurred");
                                }
                                // Don't hide or clean up
                                return;
                            } 
                            else if (responseData.status === "success") {
                                // Display success toast if toastr is available
                                if (typeof toastr !== 'undefined') {
                                    toastr.success(
                                        responseData.message || "Changes saved successfully", 
                                        responseData.title || "", 
                                        {
                                            closeButton: true,
                                            progressBar: true,
                                            timeOut: 3000
                                        }
                                    );
                                }

                                // Handle successful save
                                this.handleSuccessfulSave(value, submitValue, responseData);
                                return;
                            }
                        }

                        // Legacy success callback
                        if (typeof this.options.success === 'function') {
                            const result = this.options.success.call(this.element, responseData, value);
                            if (result === false) {
                                // Keep form open, don't set value
                                return;
                            }
                            if (typeof result === 'string') {
                                // Show error
                                if (this.form && typeof this.form.error === 'function') {
                                    this.form.error(result);
                                }
                                return;
                            }
                            if (result && typeof result === 'object' && result.hasOwnProperty('newValue')) {
                                // Override submitted value
                                value = result.newValue;
                            }
                        }

                        // Default success behavior
                        this.handleSuccessfulSave(value, submitValue, responseData);
                    })
                    .catch(error => {
                        this.container.hideLoading();

                        console.error('Fetch error:', error);

                        // Create a user-friendly error message
                        let userErrorMsg;

                        if (error.status === 404) {
                            userErrorMsg = 'The requested resource was not found (404).';
                        } else if (error.status === 403) {
                            userErrorMsg = 'Access denied (403). You do not have permission for this action.';
                        } else if (error.status === 500) {
                            userErrorMsg = 'Server error (500). Please try again later.';
                        } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                            userErrorMsg = 'Network error. Please check your connection and try again.';
                        } else {
                            userErrorMsg = `Error: ${error.message || 'Unknown error occurred'}`;
                        }

                        // Run error callback if defined
                        if (typeof this.options.error === 'function') {
                            const customErrorMsg = this.options.error.call(this.element, error, value);
                            if (customErrorMsg) {
                                userErrorMsg = customErrorMsg;
                            }
                        }

                        // Show error in form
                        if (this.form && typeof this.form.error === 'function') {
                            this.form.error(userErrorMsg);
                        } else {
                            // Fallback to toastr
                            if (typeof toastr !== 'undefined') {
                                toastr.error(userErrorMsg, 'Error', {
                                    closeButton: true,
                                    progressBar: true,
                                    timeOut: 5000
                                });
                            }
                        }
                    });
            } else {
                // Just set new value without sending to server
                this.handleSuccessfulSave(value, submitValue, null);
            }
        }

        handleSuccessfulSave(value, submitValue, responseData) {
            // Set new value
            this.setValue(value);

            // Hide the form
            this.hide();

            // Clean up if configured
            if (this.options.cleanupOnSave) {
                this.softCleanup();
            }

            // Trigger save event
            this.triggerEvent('save', {
                newValue: value,
                submitValue: submitValue,
                response: responseData,
                timestamp: this.options.timestamp,
                user: this.options.user
            });

            console.log(`Successfully saved at ${this.options.timestamp} by ${this.options.user}`);
        }

        setValue(value) {
            this.options.value = value;

            // Update the display value
            const displayValue = (value === null || value === undefined || value === '') ? 
                this.options.emptytext : value;

            // Update element content
            if (this.element) {
                this.element.innerHTML = displayValue;
            }
        }

        // Trigger custom event
        triggerEvent(eventName, data = {}) {
            if (!this.element) return;

            const event = new CustomEvent(`editable:${eventName}`, {
                bubbles: true,
                cancelable: true,
                detail: {
                    editable: this,
                    ...data
                }
            });

            this.element.dispatchEvent(event);
        }

        // Full destroy - use only when completely removing the editable
        destroy() {
            console.log(`Editable destroyed at ${this.options.timestamp} by ${this.options.user}`);

            // Remove click handler
            if (this.element && this._clickHandler) {
                this.element.removeEventListener('click', this._clickHandler);
            }

            // Remove editable reference and class
            if (this.element) {
                this.element.editable = null;
                this.element.classList.remove('editable', 'editable-open');
            }

            // Destroy container
            if (this.container && typeof this.container.destroy === 'function') {
                this.container.destroy();
            }

            // Nullify all references
            this.container = null;
            this.form = null;
            this.input = null;
            this._clickHandler = null;
            this.element = null;
            this.options = null;
        }
    }

    /**
     * EditableForm class - FIXED
     */
    class EditableForm {
        constructor(editable) {
            this.editable = editable;
            this.options = editable ? editable.options : {};
            this.input = editable ? editable.input : null;
            this.hasError = false;

            // Explicitly bind methods
            this.submit = this.submit.bind(this);
            this.clearError = this.clearError.bind(this);
            this.error = this.error.bind(this);
        }

        render() {
            // Create form element
            this.element = document.createElement('form');
            this.element.className = 'editable-form';

            // Create input container
            const inputContainer = document.createElement('div');
            inputContainer.classList.add('editable-input', 'w-100');

            // Render input
            if (this.input && typeof this.input.render === 'function') {
                this.input.render();
            }

            // Append input to container
            if (this.input && this.input.element) {
                inputContainer.appendChild(this.input.element);
            }

            // Reset error state
            this.hasError = false;

            // Append input container to form
            this.element.appendChild(inputContainer);

            // Create buttons if needed
            if (this.options.showbuttons) {
                // Create buttons container
                const buttonsContainer = document.createElement('div');
                buttonsContainer.className = 'd-flex justify-content-end m-3 me-0 mb-0 gap-1';

                // Submit button
                const submitButton = document.createElement('button');
                submitButton.type = 'submit';
                submitButton.className = 'btn btn-primary btn-icon btn-sm editable-submit';
                submitButton.innerHTML = '<i class="ki-duotone ki-check fs-2x"></i>';

                // Cancel button
                const cancelButton = document.createElement('button');
                cancelButton.type = 'button';
                cancelButton.className = 'btn btn-secondary btn-icon btn-sm editable-cancel';
                cancelButton.innerHTML = '<i class="ki-duotone ki-cross fs-2x"><span class="path1"></span><span class="path2"></span></i>';

                // Add buttons to container
                buttonsContainer.appendChild(submitButton);
                buttonsContainer.appendChild(cancelButton);

                // Store reference to this instance for the event handler
                const formInstance = this;

                // Add event listener for cancel button
                cancelButton.addEventListener('click', function(e) {
                    e.preventDefault();

                    // Use the cancel method on editable
                    if (formInstance.editable && typeof formInstance.editable.cancel === 'function') {
                        formInstance.editable.cancel();
                    }
                });

                // Append buttons container to form
                this.element.appendChild(buttonsContainer);
            }

            // Create error container
            this.errorContainer = document.createElement('div');
            this.errorContainer.className = 'editable-error text-danger';
            this.errorContainer.style.display = 'none';
            this.errorContainer.style.marginTop = '0.5rem';
            this.errorContainer.style.fontWeight = '500';

            // Append error container to form
            this.element.appendChild(this.errorContainer);

            // Add form to container
            if (this.editable && this.editable.container) {
                this.editable.container.setContent(this.element);
            }

            // Store a reference to the instance
            const formInstance = this;

            // Add form submit handler
            this.element.addEventListener('submit', function(e) {
                e.preventDefault();
                formInstance.submit();
            });

            // Set up autosubmit if no buttons are shown
            if (!this.options.showbuttons && this.input) {
                this.input.autosubmit();
            }

            // Set initial value
            const value = this.editable && this.editable.options ? 
                (this.editable.options.value !== null ? 
                    this.editable.options.value : this.editable.options.defaultValue) : '';

            if (this.input && typeof this.input.value2input === 'function') {
                this.input.value2input(value);
            }

            // Activate input (focus)
            setTimeout(() => {
                if (this.input && typeof this.input.activate === 'function') {
                    this.input.activate();
                }
            }, 0);
        }

        submit() {
            // Safety check
            if (!this.element || !this.input || !this.editable) {
                console.warn('Submit called with missing components');
                return;
            }

            try {
                // Get value from input
                const newValue = this.input.input2value();

                // Log the submission
                console.log(`Form submission at ${this.options.timestamp} by ${this.options.user}`);

                // Validate value
                const error = this.editable && typeof this.editable.validate === 'function' ? 
                    this.editable.validate(newValue) : null;

                if (error) {
                    this.error(error);
                    return;
                }

                // Clear any errors
                this.clearError();

                // Save value
                if (typeof this.editable.save === 'function') {
                    this.editable.save(newValue);
                }
            } catch (e) {
                console.error('Error during form submission:', e);
                this.error('An unexpected error occurred');
            }
        }

        clearError() {
            if (!this.errorContainer) return;

            this.errorContainer.classList.add('d-none');
            this.errorContainer.textContent = '';
            this.errorContainer.style.display = 'none';

            if (this.element) {
                this.element.classList.remove('text-danger', 'is-invalid');
            }

            this.hasError = false;
        }

        error(msg) {
            if (!this.element || !this.errorContainer) {
                console.error('Error container or form element is missing');
                return;
            }

            try {
                if (msg === false) {
                    // Clearing error
                    this.clearError();
                } else {
                    // Showing error
                    this.errorContainer.classList.remove('d-none');
                    this.errorContainer.textContent = msg;
                    this.errorContainer.style.display = 'block';
                    this.element.classList.add('text-danger');
                    this.hasError = true;

                    console.log('Form error displayed:', msg);
                }
            } catch (e) {
                console.error('Error while updating error display:', e);
            }
        }

        onHide() {
            if (!this.isDestroyed) {
                this.clearError();
            }
        }

        destroy() {
            if (this.isDestroyed) return;

            this.isDestroyed = true;
            console.log('Form destroy called');

            // Remove event listeners
            if (this.element) {
                if (this._submitHandler) {
                    this.element.removeEventListener('submit', this._submitHandler);
                }
            }

            if (this.cancelButton && this._cancelHandler) {
                this.cancelButton.removeEventListener('click', this._cancelHandler);
            }

            // Clear references to DOM elements
            if (this.element && this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }

            // Clear all references
            this.element = null;
            this.errorContainer = null;
            this.submitButton = null;
            this.cancelButton = null;
            this._submitHandler = null;
            this._cancelHandler = null;

            // Don't null out the editable reference as it might still need this instance
        }
        
        cleanup() {
            // Clear error display
            this.clearError();

            // Remove event listeners
            if (this.element) {
                if (this._submitHandler) {
                    this.element.removeEventListener('submit', this._submitHandler);
                }
            }

            if (this.cancelButton && this._cancelHandler) {
                this.cancelButton.removeEventListener('click', this._cancelHandler);
            }

            // Clear DOM elements but don't remove from DOM yet
            if (this.element) {
                this.element.innerHTML = '';
            }

            // Clear references to button elements
            this.submitButton = null;
            this.cancelButton = null;
            this.errorContainer = null;

            console.log('Form cleaned up (not destroyed)');
        }
    }

    /**
     * Base Input class
     */
    class AbstractInput {
        constructor(editable, options) {
            this.editable = editable;
            this.options = options || {};
            this.isDestroyed = false;
            this.init();
        }
        
        init() {
            // Create element
            this.element = document.createElement('div');
            this.element.classList.add('editable-input', 'w-100');
        }
        
        render() {
            // To be implemented by child classes
        }
        
        activate() {
            // Focus on the input
            if (!this.isDestroyed && this.input) {
                try {
                    this.input.focus();
                } catch (e) {
                    console.debug('Error focusing input:', e);
                }
            }
        }
        
        value2html(value) {
            return value !== null && value !== undefined ? String(value) : '';
        }
        
        html2value(html) {
            return html.trim();
        }
        
        value2str(value) {
            return value !== null && value !== undefined ? String(value) : '';
        }
        
        str2value(str) {
            return str;
        }
        
        value2submit(value) {
            return this.value2str(value);
        }
        
        value2input(value) {
            if (!this.isDestroyed && this.input) {
                this.input.value = value !== null && value !== undefined ? String(value) : '';
            }
        }
        
        input2value() {
            return !this.isDestroyed && this.input ? this.input.value : null;
        }
        
        clear() {
            if (!this.isDestroyed && this.input) {
                this.input.value = '';
            }
        }
        
        escape(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }
        
        autosubmit() {
            // To be implemented by child classes
        }
        
        setupBlurHandler() {
            if (!this.input || this.options.onblur !== 'submit') {
                return;
            }

            this._blurHandler = () => {
                // Small delay to allow other events to complete
                setTimeout(() => {
                    // Don't submit if we've lost focus because the form is being hidden
                    if (this.isDestroyed || !this.editable || !this.editable.form) {
                        return;
                    }

                    // Clear any existing errors
                    if (typeof this.editable.form.clearError === 'function') {
                        this.editable.form.clearError();
                    }

                    // Submit the form
                    if (typeof this.editable.form.submit === 'function') {
                        this.editable.form.submit();
                    }
                }, 100);
            };

            this.input.addEventListener('blur', this._blurHandler);
        }

        destroy() {
            this.isDestroyed = true;

            // Basic cleanup - specific input types should override and call super.destroy()
            this.element = null;
            this.input = null;
        }
    }
    
    /**
     * Container base class
     */
    class AbstractContainer {
        constructor(editable) {
            this.editable = editable;
            this.options = editable.options;
            this.escKeyHandler = null;
            this.outsideClickHandler = null;
            this.enterKeyHandler = null;
            this.isDestroyed = false;
            this.init();
        }
        
        setupEventHandlers() {
            // Setup outside click handler
            this.outsideClickHandler = (e) => {
                if (this.isDestroyed) return;
                
                if (this.isVisible() &&
                    !this.element.contains(e.target) &&
                    e.target !== this.editable.element &&
                    !this.editable.element.contains(e.target)) {
                    // Handle onblur option
                    if (this.options.onblur === 'submit') {
                        if (this.editable.form && typeof this.editable.form.submit === 'function') {
                            this.editable.form.submit();
                        }
                    } else if (this.options.onblur === 'cancel') {
                        if (typeof this.hide === 'function') {
                            this.hide();
                        }
                        if (this.editable && typeof this.editable.triggerEvent === 'function') {
                            this.editable.triggerEvent('cancel');
                        }
                    }
                    // If onblur is 'ignore', do nothing
                }
            };
            
            // Setup escape key handler
            this.escKeyHandler = (e) => {
                if (this.isDestroyed) return;
                
                if (e.key === 'Escape' && this.isVisible()) {
                    if (this.options.enableEscape !== false) { // Only respond if not explicitly disabled
                        if (typeof this.hide === 'function') {
                            this.hide();
                        }
                        if (this.editable && typeof this.editable.triggerEvent === 'function') {
                            this.editable.triggerEvent('cancel');
                        }
                    }
                }
            };
            
            // Setup enter key handler
            this.enterKeyHandler = (e) => {
                if (this.isDestroyed) return;
                
                // Only proceed if enabled and not in textarea (where Enter should create a new line)
                if (this.options.enableEnter !== false &&
                    e.key === 'Enter' &&
                    this.isVisible() &&
                    e.target.tagName.toLowerCase() !== 'textarea' &&
                    !e.shiftKey && !e.ctrlKey && !e.altKey) {
                    // If the active element is not inside the form, do nothing
                    const form = this.element.querySelector('.editable-form');
                    if (!form || !form.contains(e.target)) return;
                    
                    // Submit the form
                    e.preventDefault();
                    if (this.editable.form && typeof this.editable.form.submit === 'function') {
                        this.editable.form.submit();
                    }
                }
            };
            
            // Attach handlers - use capture for some events to ensure they're handled first
            document.addEventListener('mousedown', this.outsideClickHandler);
            document.addEventListener('keyup', this.escKeyHandler);
            document.addEventListener('keydown', this.enterKeyHandler, true);
        }
        
        isVisible() {
            return !this.isDestroyed && this.element &&
                (this.element.style.display === 'block' ||
                 this.element.classList.contains('show'));
        }
        
        removeEventHandlers() {
            if (this.outsideClickHandler) {
                document.removeEventListener('mousedown', this.outsideClickHandler);
                this.outsideClickHandler = null;
            }
            
            if (this.escKeyHandler) {
                document.removeEventListener('keyup', this.escKeyHandler);
                this.escKeyHandler = null;
            }
            
            if (this.enterKeyHandler) {
                document.removeEventListener('keydown', this.enterKeyHandler, true);
                this.enterKeyHandler = null;
            }
        }
        
        destroy() {
            this.isDestroyed = true;
            this.removeEventHandlers();
            
            if (this.element && this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
                this.element = null;
            }
        }
        
        init() {
            // To be implemented by child classes
        }
        
        show() {
            // To be implemented by child classes
        }
        
        hide() {
            // Basic implementation - to be overridden by child classes
            if (this.editable && this.editable.form && 
                typeof this.editable.form.onHide === 'function') {
                this.editable.form.onHide();
            }
        }
        
        setContent(content) {
            // Basic implementation - child classes should override
            if (this.isDestroyed || !this.element) return;
            
            try {
                // Clear previous content
                while (this.element.firstChild) {
                    this.element.removeChild(this.element.firstChild);
                }
                
                // If content is a DOM element, append it
                if (content instanceof Element) {
                    this.element.appendChild(content);
                } else if (typeof content === 'string') {
                    // Otherwise set as HTML
                    this.element.innerHTML = content;
                }
            } catch (e) {
                console.error('Error setting container content:', e);
            }
        }
        
        showLoading() {
            // To be implemented by child classes
        }
        
        hideLoading() {
            // To be implemented by child classes
        }
        
        emptyContent() {
            // Abstract method to be implemented by subclasses
        }
    }

    /**
     * Popover Container (for popup mode)
     */
    class PopoverContainer extends AbstractContainer {
        init() {
            // Create popover container with Bootstrap 5 classes
            this.element = document.createElement('div');
            this.element.className = 'popover bs-popover-auto fade position-relative position-absolute';
            this.element.setAttribute('role', 'tooltip');
            
            // Create the arrow with Bootstrap 5 class
            this.arrow = document.createElement('div');
            this.arrow.className = 'popover-arrow';
            this.element.appendChild(this.arrow);
            
            // Create popover inner wrapper (for proper Bootstrap styling)
            this.innerWrapper = document.createElement('div');
            this.innerWrapper.className = 'popover-inner';
            this.element.appendChild(this.innerWrapper);
            
            // Optional title if specified in options
            if (this.options.title) {
                this.header = document.createElement('h3');
                this.header.className = 'popover-header';
                this.header.textContent = this.options.title;
                this.innerWrapper.appendChild(this.header);
            }
            
            // Create popover body using Bootstrap class
            this.body = document.createElement('div');
            this.body.className = 'popover-body';
            this.innerWrapper.appendChild(this.body);
            
            // Create loading indicator
            this.loading = document.createElement('div');
            this.loading.className = 'position-absolute w-100 h-100 top-0 start-0 d-flex align-items-center justify-content-center bg-white bg-opacity-75 d-none';
            this.loading.style.zIndex = '1060';
            this.loading.innerHTML = '<div class="spinner-border spinner-border-sm text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';
            this.element.appendChild(this.loading);
            
            // Add custom class to identify as an editable container
            this.element.classList.add('editable-container');
            
            // Append to body
            document.body.appendChild(this.element);
            
            // Setup event handlers
            this.setupEventHandlers();
        }
        
        show() {
            if (this.isDestroyed) return;
            
            this.setPosition();
            this.element.classList.add('bs-popover-auto', 'show');
        }
        
        emptyContent() {
            if (this.body) {
                this.body.innerHTML = '';
            }
        }
        
        hide() {
            if (!this.element) return;

            this.element.classList.remove('show');

            // Notify the form
            if (this.editable && this.editable.form && 
                typeof this.editable.form.clearError === 'function') {
                this.editable.form.clearError();
            }
        }

        removeFromDOM() {
            if (this.isDestroyed || !this.element) return;

            if (this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
                console.log('Popover container removed from DOM');
            }
        }

        destroy() {
            // Only use for complete removal
            if (this.element && this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }

            // Remove event listeners
            window.removeEventListener('resize', this._resizeHandler);
            window.removeEventListener('scroll', this._scrollHandler);
            document.removeEventListener('mousedown', this._outsideClickHandler);

            // Nullify references
            this.element = null;
            this.body = null;
            this.arrow = null;
            this.loading = null;
            this._resizeHandler = null;
            this._scrollHandler = null;
            this._outsideClickHandler = null;
        }
        
        setContent(content) {
            // Check if destroyed
            if (this.isDestroyed || !this.body) return;
            
            try {
                // Clear previous content
                while (this.body.firstChild) {
                    this.body.removeChild(this.body.firstChild);
                }
                
                // If content is a DOM element, append it
                if (content instanceof Element) {
                    this.body.appendChild(content);
                } else if (typeof content === 'string') {
                    // Otherwise set as HTML
                    this.body.innerHTML = content;
                }
                
                // Update position as content might change size
                if (this.element.classList.contains('show')) {
                    this.setPosition();
                }
            } catch (e) {
                console.error('Error setting popover content:', e);
            }
        }
        
        showLoading() {
            if (this.isDestroyed) return;
            
            if (this.loading) {
                this.loading.classList.remove('d-none');
            }
        }
        
        hideLoading() {
            if (this.isDestroyed) return;
            
            if (this.loading) {
                this.loading.classList.add('d-none');
            }
        }
        
        setPosition() {
            if (this.isDestroyed || !this.element || !this.editable || !this.editable.element) {
                return;
            }
            
            try {
                const elementRect = this.editable.element.getBoundingClientRect();
                const containerRect = this.element.getBoundingClientRect();
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
                const placement = this.options.placement || 'top';
                
                // Remove any existing placement classes
                this.element.classList.remove(
                    'bs-popover-top',
                    'bs-popover-bottom',
                    'bs-popover-start',
                    'bs-popover-end'
                );
                
                // Add the correct placement class (critical for arrow styling)
                const placementMap = {
                    'top': 'bs-popover-top',
                    'bottom': 'bs-popover-bottom',
                    'left': 'bs-popover-start',
                    'right': 'bs-popover-end'
                };
                
                this.element.classList.add(placementMap[placement] || 'bs-popover-top');
                
                // Calculate position based on placement
                let top, left;
                
                // Default is top placement
                switch (placement) {
                    case 'top':
                        top = elementRect.top - containerRect.height;
                        left = elementRect.left + (elementRect.width / 2) - (containerRect.width / 2);
                        
                        if (this.arrow) {
                            this.arrow.style.position = 'absolute';
                            this.arrow.style.top = 'calc(100% - 1px)'; // -1px to overlap border
                            this.arrow.style.left = '50%';
                            this.arrow.style.transform = 'translateX(-50%)';
                            this.arrow.style.right = '';
                            this.arrow.style.bottom = '';
                        }
                        break;
                        
                    case 'bottom':
                        top = elementRect.bottom;
                        left = elementRect.left + (elementRect.width / 2) - (containerRect.width / 2);
                        
                        if (this.arrow) {
                            this.arrow.style.position = 'absolute';
                            this.arrow.style.top = '-9px';
                            this.arrow.style.left = '50%';
                            this.arrow.style.transform = 'translateX(-50%)';
                            this.arrow.style.right = '';
                            this.arrow.style.bottom = '';
                        }
                        break;
                        
                    case 'left':
                        top = elementRect.top + (elementRect.height / 2) - (containerRect.height / 2);
                        left = elementRect.left - containerRect.width;
                        
                        if (this.arrow) {
                            this.arrow.style.position = 'absolute';
                            this.arrow.style.top = '50%';
                            this.arrow.style.right = '-9px';
                            this.arrow.style.left = '';
                            this.arrow.style.transform = 'translateY(-50%)';
                            this.arrow.style.bottom = '';
                        }
                        break;
                        
                    case 'right':
                        top = elementRect.top + (elementRect.height / 2) - (containerRect.height / 2);
                        left = elementRect.right;
                        
                        if (this.arrow) {
                            this.arrow.style.position = 'absolute';
                            this.arrow.style.top = '50%';
                            this.arrow.style.left = '-9px';
                            this.arrow.style.right = '';
                            this.arrow.style.transform = 'translateY(-50%)';
                            this.arrow.style.bottom = '';
                        }
                        break;
                }
                
                // Boundary checks to ensure popover stays in viewport
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                
                // Adjust if outside viewport horizontally
                if (left < 0) {
                    left = 0;
                } else if (left + containerRect.width > viewportWidth) {
                    left = viewportWidth - containerRect.width;
                }
                
                // Adjust if outside viewport vertically
                if (top < 0) {
                    top = 0;
                } else if (top + containerRect.height > viewportHeight) {
                    top = viewportHeight - containerRect.height;
                }
                
                // Adjust for scrolling
                top += scrollTop;
                left += scrollLeft;
                
                // Apply final positioning
                this.element.style.top = `${top}px`;
                this.element.style.left = `${left}px`;
                
                // Make sure the arrow is displayed
                if (this.arrow) {
                    this.arrow.style.display = 'block';
                }
            } catch (e) {
                console.error('Error setting popover position:', e);
            }
        }
        
        cleanup() {
            // Just clean the content, don't remove the container
            if (this.body) {
                this.body.innerHTML = '';
            }

            console.log('Container content cleaned up');
        }
    }

    /**
     * Inline Container (for inline mode)
     */
    class InlineContainer extends AbstractContainer {
        init() {
            // Create inline container
            this.element = document.createElement('div');
            this.element.classList.add('editable-container', 'editable-inline', 'position-relative', 'mb-3');
            
            // Create loading indicator
            this.loading = document.createElement('div');
            this.loading.className = 'editable-loading position-absolute w-100 h-100 top-0 start-0 d-flex align-items-center justify-content-center bg-white bg-opacity-75 d-none';
            this.loading.innerHTML = '<div class="spinner-border spinner-border-sm text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';
            this.element.appendChild(this.loading);
            
            // Insert container after the editable element
            if (this.editable && this.editable.element && this.editable.element.parentNode) {
                this.editable.element.parentNode.insertBefore(this.element, this.editable.element.nextSibling);
            } else {
                console.error('Cannot initialize inline container: parent element not found');
            }
            
            // Initially hide container
            this.element.style.display = 'none';
            
            // Setup event handlers
            this.setupEventHandlers();
        }
        
        show() {
            if (this.isDestroyed || !this.element || !this.editable || !this.editable.element) {
                return;
            }
            
            // Hide the editable element
            this.editable.element.style.display = 'none';
            
            // Show container
            this.element.style.display = 'block';
        }
        
        emptyContent() {
            if (this.element) {
                this.element.innerHTML = '';
            }
        }
        
        hide() {
            if (!this.element || !this.editable || !this.editable.element) return;

            // Show the editable element
            this.editable.element.style.display = '';

            // Hide the container
            this.element.style.display = 'none';

            // Notify the form
            if (this.editable.form && typeof this.editable.form.clearError === 'function') {
                this.editable.form.clearError();
            }
        }

        destroy() {
            // Only use for complete removal
            if (this.element && this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }

            this.element = null;
            this.loading = null;
        }
        
        setContent(content) {
            if (this.isDestroyed || !this.element) {
                return;
            }
            
            try {
                // Remove all child elements except loading indicator
                const children = Array.from(this.element.children);
                children.forEach(child => {
                    if (child !== this.loading) {
                        this.element.removeChild(child);
                    }
                });
                
                // If content is a DOM element, append it
                if (content instanceof Element) {
                    this.element.insertBefore(content, this.loading);
                } else if (typeof content === 'string') {
                    // Create a wrapper for string content
                    const wrapper = document.createElement('div');
                    wrapper.innerHTML = content;
                    this.element.insertBefore(wrapper, this.loading);
                }
            } catch (e) {
                console.error('Error setting inline container content:', e);
            }
        }
        
        showLoading() {
            if (this.isDestroyed || !this.loading) {
                return;
            }
            
            // Show loading indicator
            this.loading.classList.remove('d-none');
            
            // Hide form
            /*const form = this.element.querySelector('.editable-form');
            if (form) {
                form.style.visibility = 'hidden';
            }*/
        }
        
        hideLoading() {
            if (this.isDestroyed || !this.loading) {
                return;
            }
            
            // Hide loading indicator
            this.loading.classList.add('d-none');
            
            // Show form
            /*const form = this.element.querySelector('.editable-form');
            if (form) {
                form.style.visibility = 'visible';
            }*/
        }
        
        cleanup() {
            // Just clean the content
            if (this.element) {
                this.element.innerHTML = '';
            }

            console.log('Inline container content cleaned up');
        }
    }

    /**
     * Text Input
     */
    class TextInput extends AbstractInput {
        init() {
            super.init();
            
            // Create input element
            this.input = document.createElement('input');
            this.input.type = 'text';
            this.input.className = 'form-control';
            
            if (this.options.placeholder) {
                this.input.placeholder = this.options.placeholder;
            }
            
            // Append input to container
            this.element.appendChild(this.input);
            
            // Add clear button if needed
            if (this.options.clear !== false) {
                this.createClearButton();
            }
            
            // Store event handlers for cleanup
            this._inputHandler = null;
            this._clearHandler = null;
            this._submitHandler = null;
        }
        
        createClearButton() {
            this.clearButton = document.createElement('span');
            this.clearButton.className = 'editable-clear-x';
            this.clearButton.innerHTML = '&times;';
            this.clearButton.style.position = 'absolute';
            this.clearButton.style.right = '10px';
            this.clearButton.style.top = '50%';
            this.clearButton.style.transform = 'translateY(-50%)';
            this.clearButton.style.cursor = 'pointer';
            this.clearButton.style.display = 'none';
            
            // Make sure element has position for absolute positioning of clear button
            this.element.style.position = 'relative';
            
            // Append clear button to container
            this.element.appendChild(this.clearButton);
            
            // Create handlers with proper binding
            this._inputHandler = () => {
                this.toggleClear();
            };
            
            this._clearHandler = (e) => {
                e.preventDefault();
                this.clear();
                if (this.input) {
                    this.input.focus();
                }
            };
            
            // Add event listeners
            this.input.addEventListener('input', this._inputHandler);
            this.clearButton.addEventListener('click', this._clearHandler);
        }
        
        toggleClear() {
            if (this.isDestroyed || !this.clearButton || !this.input) {
                return;
            }
            
            this.clearButton.style.display = this.input.value.length ? 'block' : 'none';
        }
        
        activate() {
            super.activate();
            
            if (!this.isDestroyed) {
                this.toggleClear();
            }
        }
        
        clear() {
            super.clear();
            
            if (!this.isDestroyed) {
                this.toggleClear();
            }
        }
        
        autosubmit() {
            if (!this.input || !this.options.autosubmit) {
                return;
            }

            // Create handler with proper binding
            this._submitHandler = (e) => {
                if (e.key === 'Enter') {
                    // Clear any existing errors
                    if (this.editable && this.editable.form && 
                        typeof this.editable.form.clearError === 'function') {
                        this.editable.form.clearError();
                    }

                    // Submit the form
                    if (this.editable && this.editable.form && 
                        typeof this.editable.form.submit === 'function') {
                        this.editable.form.submit();
                    }
                }
            };

            // Add event listener
            this.input.addEventListener('keydown', this._submitHandler);

            // Handle blur event if onblur option is set to 'submit'
            if (this.options.onblur === 'submit') {
                this._blurHandler = () => {
                    // Small delay to allow other events to complete
                    setTimeout(() => {
                        // Don't submit if we've lost focus because the form is being hidden
                        if (this.isDestroyed || !this.editable || !this.editable.form) {
                            return;
                        }

                        // Clear any existing errors
                        if (typeof this.editable.form.clearError === 'function') {
                            this.editable.form.clearError();
                        }

                        // Submit the form
                        if (typeof this.editable.form.submit === 'function') {
                            this.editable.form.submit();
                        }
                    }, 100);
                };

                this.input.addEventListener('blur', this._blurHandler);
            }
        }

        destroy() {
            // Remove event listeners
            if (this.input) {
                if (this._submitHandler) {
                    this.input.removeEventListener('keydown', this._submitHandler);
                }
                if (this._blurHandler) {
                    this.input.removeEventListener('blur', this._blurHandler);
                }
            }

            // Clear handler references
            this._submitHandler = null;
            this._blurHandler = null;

            // Call parent destroy
            super.destroy();
        }
    }

    /**
     * Textarea Input
     */
    class TextareaInput extends AbstractInput {
        init() {
            super.init();
            
            // Create textarea element
            this.input = document.createElement('textarea');
            this.input.className = 'form-control';
            
            if (this.options.placeholder) {
                this.input.placeholder = this.options.placeholder;
            }
            
            if (this.options.rows) {
                this.input.rows = this.options.rows;
            } else {
                this.input.rows = 7;
            }
            
            // Append textarea to container
            this.element.appendChild(this.input);
            
            // Store event handler for cleanup
            this._submitHandler = null;
        }
        
        autosubmit() {
            if (!this.input || !this.options.autosubmit) {
                return;
            }

            // Create handler with proper binding
            this._submitHandler = (e) => {
                // CTRL+Enter submits the form for textarea
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault(); // Prevent newline

                    // Clear any existing errors
                    if (this.editable && this.editable.form && 
                        typeof this.editable.form.clearError === 'function') {
                        this.editable.form.clearError();
                    }

                    // Submit the form
                    if (this.editable && this.editable.form && 
                        typeof this.editable.form.submit === 'function') {
                        this.editable.form.submit();
                    }
                }
            };

            // Add event listener
            this.input.addEventListener('keydown', this._submitHandler);

            // Handle blur event if onblur option is set to 'submit'
            if (this.options.onblur === 'submit') {
                this._blurHandler = () => {
                    // Small delay to allow other events to complete
                    setTimeout(() => {
                        // Don't submit if we've lost focus because the form is being hidden
                        if (this.isDestroyed || !this.editable || !this.editable.form) {
                            return;
                        }

                        // Clear any existing errors
                        if (typeof this.editable.form.clearError === 'function') {
                            this.editable.form.clearError();
                        }

                        // Submit the form
                        if (typeof this.editable.form.submit === 'function') {
                            this.editable.form.submit();
                        }
                    }, 100);
                };

                this.input.addEventListener('blur', this._blurHandler);
            }
        }

        destroy() {
            // Remove event listeners
            if (this.input) {
                if (this._submitHandler) {
                    this.input.removeEventListener('keydown', this._submitHandler);
                }
                if (this._blurHandler) {
                    this.input.removeEventListener('blur', this._blurHandler);
                }
            }

            // Clear handler references
            this._submitHandler = null;
            this._blurHandler = null;

            // Call parent destroy
            super.destroy();
        }
    }

    /**
     * Select Input
     */
    class SelectInput extends AbstractInput {
        init() {
            super.init();
            
            // Create select element
            this.input = document.createElement('select');
            this.input.className = 'form-select';
            
            // Append select to container
            this.element.appendChild(this.input);
            
            // Process source
            this.processSource();
            
            // Store event handler for cleanup
            this._changeHandler = null;
        }
        
        async processSource() {
            if (this.isDestroyed) return;
            
            try {
                let source = this.options.source;
                
                if (typeof source === 'function') {
                    source = source.call(this.editable.element);
                }
                
                if (typeof source === 'string') {
                    // It's a URL
                    try {
                        const response = await fetch(source);
                        if (!response.ok) {
                            throw new Error(`HTTP error ${response.status}`);
                        }
                        source = await response.json();
                    } catch (error) {
                        console.error('Error loading source:', error);
                        source = [];
                    }
                }
                
                this.sourceData = this.convertSource(source);
            } catch (e) {
                console.error('Error processing select source:', e);
                this.sourceData = [];
            }
        }
        
        convertSource(source) {
            if (!source) return [];
            
            try {
                // Convert to standard format: [{value: '1', text: 'Option 1'}, ...]
                if (Array.isArray(source)) {
                    return source.map(item => {
                        if (typeof item === 'object' && item !== null) {
                            if (item.value !== undefined && item.text !== undefined) {
                                return item;
                            } else if (item.id !== undefined && item.text !== undefined) {
                                return {
                                    value: item.id,
                                    text: item.text
                                };
                            } else {
                                // Take first property as value, second as text
                                const keys = Object.keys(item);
                                if (keys.length >= 2) {
                                    return {
                                        value: item[keys[0]],
                                        text: item[keys[1]]
                                    };
                                }
                            }
                        }
                        return {
                            value: item,
                            text: item
                        };
                    });
                } else if (typeof source === 'object' && source !== null) {
                    // Object like {1: 'Option 1', 2: 'Option 2'}
                    return Object.entries(source).map(([value, text]) => ({
                        value,
                        text
                    }));
                }
            } catch (e) {
                console.error('Error converting select source:', e);
            }
            
            return [];
        }
        
        render() {
            if (this.isDestroyed || !this.input) {
                return;
            }
            
            try {
                // Clear previous options
                this.input.innerHTML = '';
                
                // Add options from source
                if (this.sourceData && this.sourceData.length) {
                    this.sourceData.forEach(item => {
                        const option = document.createElement('option');
                        option.value = item.value;
                        option.text = item.text;
                        this.input.appendChild(option);
                    });
                }
            } catch (e) {
                console.error('Error rendering select options:', e);
            }
        }
        
        value2input(value) {
            if (this.isDestroyed || !this.input) {
                return;
            }
            
            try {
                this.input.value = value !== null && value !== undefined ? String(value) : '';
            } catch (e) {
                console.debug('Error setting select value:', e);
            }
        }
        
        value2html(value) {
            if (value === null || value === undefined || !this.sourceData) {
                return '';
            }
            
            try {
                const item = this.sourceData.find(item =>
                    String(item.value) === String(value)
                );
                return item ? item.text : value;
            } catch (e) {
                console.debug('Error converting select value to HTML:', e);
                return value;
            }
        }
        
        autosubmit() {
            if (!this.input || !this.options.autosubmit) {
                return;
            }

            // Create handler with proper binding - submit on change
            this._changeHandler = () => {
                // Clear any existing errors
                if (this.editable && this.editable.form && 
                    typeof this.editable.form.clearError === 'function') {
                    this.editable.form.clearError();
                }

                // Submit the form
                if (this.editable && this.editable.form && 
                    typeof this.editable.form.submit === 'function') {
                    this.editable.form.submit();
                }
            };

            // Add event listener
            this.input.addEventListener('change', this._changeHandler);
        }

        destroy() {
            // Remove event listeners
            if (this.input && this._changeHandler) {
                this.input.removeEventListener('change', this._changeHandler);
            }

            // Clear handler reference
            this._changeHandler = null;

            // Call parent destroy
            super.destroy();
        }
    }
    
    /**
     * Checklist Input
     */
    class ChecklistInput extends AbstractInput {
        init() {
            super.init();
            this.element.className = 'editable-checklist';
            this.inputs = [];

            // Process source
            this.processSource();
        }

        async processSource() {
            try {
                let source = this.options.source;
                if (typeof source === 'function') {
                    source = source.call(this.editable.element);
                }

                if (typeof source === 'string') {
                    // It's a URL
                    try {
                        const response = await fetch(source);
                        if (!response.ok) {
                            throw new Error(`HTTP error ${response.status}`);
                        }
                        source = await response.json();
                    } catch (error) {
                        console.error('Error loading source:', error);
                        source = [];
                    }
                }

                this.sourceData = this.convertSource(source);
            } catch (e) {
                console.error('Error processing checklist source:', e);
                this.sourceData = [];
            }
        }

        convertSource(source) {
            // Same as SelectInput
            if (!source) return [];

            try {
                if (Array.isArray(source)) {
                    return source.map(item => {
                        if (typeof item === 'object' && item !== null) {
                            if (item.value !== undefined && item.text !== undefined) {
                                return item;
                            } else if (item.id !== undefined && item.text !== undefined) {
                                return {
                                    value: item.id,
                                    text: item.text
                                };
                            } else {
                                const keys = Object.keys(item);
                                if (keys.length >= 2) {
                                    return {
                                        value: item[keys[0]],
                                        text: item[keys[1]]
                                    };
                                }
                            }
                        }
                        return {
                            value: item,
                            text: item
                        };
                    });
                } else if (typeof source === 'object' && source !== null) {
                    return Object.entries(source).map(([value, text]) => ({
                        value,
                        text
                    }));
                }
            } catch (e) {
                console.error('Error converting checklist source:', e);
            }

            return [];
        }

        render() {
            if (!this.element) {
                return;
            }

            try {
                // Clear previous checkboxes
                this.element.innerHTML = '';
                this.inputs = [];

                // Add checkboxes from source
                if (this.sourceData && this.sourceData.length) {
                    this.sourceData.forEach(item => {
                        const wrapper = document.createElement('div');
                        wrapper.className = 'form-check';

                        const input = document.createElement('input');
                        input.type = 'checkbox';
                        input.className = 'form-check-input';
                        input.value = item.value;
                        input.id = `check_${Math.random().toString(36).substr(2, 9)}`;

                        const label = document.createElement('label');
                        label.className = 'form-check-label';
                        label.htmlFor = input.id;
                        label.textContent = item.text;

                        wrapper.appendChild(input);
                        wrapper.appendChild(label);
                        this.element.appendChild(wrapper);
                        this.inputs.push(input);
                    });
                }
            } catch (e) {
                console.error('Error rendering checklist:', e);
            }
        }

        value2input(value) {
            if (!this.inputs || !this.inputs.length) return;

            try {
                // Normalize value to array
                const values = Array.isArray(value) ? value : (value ? [value] : []);

                // Check matching inputs
                this.inputs.forEach(input => {
                    input.checked = values.some(val => String(val) === String(input.value));
                });
            } catch (e) {
                console.debug('Error setting checklist value:', e);
            }
        }

        input2value() {
            if (!this.inputs || !this.inputs.length) return [];

            try {
                // Collect checked values
                return this.inputs
                    .filter(input => input.checked)
                    .map(input => input.value);
            } catch (e) {
                console.debug('Error getting checklist value:', e);
                return [];
            }
        }

        value2html(value) {
            if (!value || !this.sourceData) return '';

            try {
                // Normalize value to array
                const values = Array.isArray(value) ? value : [value];

                // Find matching text values
                const texts = values
                    .map(val => {
                        const item = this.sourceData.find(item => String(item.value) === String(val));
                        return item ? item.text : val;
                    })
                    .filter(text => text !== null && text !== undefined);

                return texts.join(', ');
            } catch (e) {
                console.debug('Error converting checklist value to HTML:', e);
                return String(value);
            }
        }

        str2value(str) {
            if (!str) return [];

            try {
                // Split by comma and trim
                return str
                    .split(',')
                    .map(item => item.trim())
                    .filter(item => item.length);
            } catch (e) {
                console.debug('Error converting string to checklist value:', e);
                return [];
            }
        }

        value2str(value) {
            if (!value) return '';

            try {
                // Join array values with comma
                return Array.isArray(value) ? value.join(',') : String(value);
            } catch (e) {
                console.debug('Error converting checklist value to string:', e);
                return '';
            }
        }

        autosubmit() {
            if (!this.inputs || !this.inputs.length || !this.options.autosubmit) {
                return;
            }

            // Create handler with proper binding
            this._changeHandler = () => {
                // Clear any existing errors
                if (this.editable && this.editable.form && 
                    typeof this.editable.form.clearError === 'function') {
                    this.editable.form.clearError();
                }

                // Submit the form
                if (this.editable && this.editable.form && 
                    typeof this.editable.form.submit === 'function') {
                    this.editable.form.submit();
                }
            };

            // Add change event to each checkbox
            this.inputs.forEach(input => {
                input.addEventListener('change', this._changeHandler);
            });
        }

        destroy() {
            // Remove event listeners from all inputs
            if (this.inputs && this.inputs.length && this._changeHandler) {
                this.inputs.forEach(input => {
                    input.removeEventListener('change', this._changeHandler);
                });
            }

            // Clear handler reference
            this._changeHandler = null;

            // Call parent destroy
            super.destroy();
        }
    }
    
    /**
     * Date Input
     */
    class DateInput extends AbstractInput {
        init() {
            super.init();
            this.input = document.createElement('input');
            this.input.type = 'date';
            this.input.className = 'form-control';
            this.element.appendChild(this.input);
        }

        value2html(value) {
            if (!value) return '';

            try {
                // Format date for display
                let date;
                if (value instanceof Date) {
                    date = value;
                } else {
                    date = new Date(value);
                }

                if (isNaN(date.getTime())) return '';

                // Format as YYYY-MM-DD
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');

                return `${year}-${month}-${day}`;
            } catch (e) {
                console.debug('Error formatting date:', e);
                return String(value);
            }
        }

        str2value(str) {
            if (!str) return null;

            try {
                const date = new Date(str);
                return isNaN(date.getTime()) ? null : date;
            } catch (e) {
                console.debug('Error converting string to date:', e);
                return null;
            }
        }

        value2input(value) {
            if (!this.input) return;

            try {
                if (!value) {
                    this.input.value = '';
                    return;
                }

                let date;
                if (value instanceof Date) {
                    date = value;
                } else {
                    date = new Date(value);
                }

                if (isNaN(date.getTime())) {
                    this.input.value = '';
                    return;
                }

                // Format as YYYY-MM-DD for input
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');

                this.input.value = `${year}-${month}-${day}`;
            } catch (e) {
                console.debug('Error setting date input value:', e);
                this.input.value = '';
            }
        }

        input2value() {
            return this.input && this.input.value ? new Date(this.input.value) : null;
        }

        autosubmit() {
            if (!this.input || !this.options.autosubmit) {
                return;
            }

            // Create handler with proper binding - submit on change
            this._changeHandler = () => {
                // Clear any existing errors
                if (this.editable && this.editable.form && 
                    typeof this.editable.form.clearError === 'function') {
                    this.editable.form.clearError();
                }

                // Submit the form
                if (this.editable && this.editable.form && 
                    typeof this.editable.form.submit === 'function') {
                    this.editable.form.submit();
                }
            };

            // Add event listener
            this.input.addEventListener('change', this._changeHandler);

            // Handle blur event if onblur option is set to 'submit'
            if (this.options.onblur === 'submit') {
                this._blurHandler = () => {
                    // Small delay to allow other events to complete
                    setTimeout(() => {
                        // Don't submit if we've lost focus because the form is being hidden
                        if (this.isDestroyed || !this.editable || !this.editable.form) {
                            return;
                        }

                        // Clear any existing errors
                        if (typeof this.editable.form.clearError === 'function') {
                            this.editable.form.clearError();
                        }

                        // Submit the form
                        if (typeof this.editable.form.submit === 'function') {
                            this.editable.form.submit();
                        }
                    }, 100);
                };

                this.input.addEventListener('blur', this._blurHandler);
            }
        }

        destroy() {
            // Remove event listeners
            if (this.input) {
                if (this._changeHandler) {
                    this.input.removeEventListener('change', this._changeHandler);
                }
                if (this._blurHandler) {
                    this.input.removeEventListener('blur', this._blurHandler);
                }
            }

            // Clear handler references
            this._changeHandler = null;
            this._blurHandler = null;

            // Call parent destroy
            super.destroy();
        }
    }

    /**
     * DateTime Input
     */
    class DateTimeInput extends AbstractInput {
        init() {
            super.init();
            this.input = document.createElement('input');
            this.input.type = 'datetime-local';
            this.input.className = 'form-control';
            this.element.appendChild(this.input);
        }

        value2html(value) {
            if (!value) return '';

            try {
                // Format datetime for display
                let date;
                if (value instanceof Date) {
                    date = value;
                } else {
                    date = new Date(value);
                }

                if (isNaN(date.getTime())) return '';

                // Format as YYYY-MM-DD HH:MM
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');

                return `${year}-${month}-${day} ${hours}:${minutes}`;
            } catch (e) {
                console.debug('Error formatting datetime:', e);
                return String(value);
            }
        }

        str2value(str) {
            if (!str) return null;

            try {
                const date = new Date(str);
                return isNaN(date.getTime()) ? null : date;
            } catch (e) {
                console.debug('Error converting string to datetime:', e);
                return null;
            }
        }

        value2input(value) {
            if (!this.input) return;

            try {
                if (!value) {
                    this.input.value = '';
                    return;
                }

                let date;
                if (value instanceof Date) {
                    date = value;
                } else {
                    date = new Date(value);
                }

                if (isNaN(date.getTime())) {
                    this.input.value = '';
                    return;
                }

                // Format as YYYY-MM-DDTHH:MM for input
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');

                this.input.value = `${year}-${month}-${day}T${hours}:${minutes}`;
            } catch (e) {
                console.debug('Error setting datetime input value:', e);
                this.input.value = '';
            }
        }

        input2value() {
            return this.input && this.input.value ? new Date(this.input.value) : null;
        }

        autosubmit() {
            if (!this.input || !this.options.autosubmit) {
                return;
            }

            // Create handler with proper binding - submit on change
            this._changeHandler = () => {
                // Clear any existing errors
                if (this.editable && this.editable.form && 
                    typeof this.editable.form.clearError === 'function') {
                    this.editable.form.clearError();
                }

                // Submit the form
                if (this.editable && this.editable.form && 
                    typeof this.editable.form.submit === 'function') {
                    this.editable.form.submit();
                }
            };

            // Add event listener
            this.input.addEventListener('change', this._changeHandler);

            // Handle blur event if onblur option is set to 'submit'
            if (this.options.onblur === 'submit') {
                this._blurHandler = () => {
                    // Small delay to allow other events to complete
                    setTimeout(() => {
                        // Don't submit if we've lost focus because the form is being hidden
                        if (this.isDestroyed || !this.editable || !this.editable.form) {
                            return;
                        }

                        // Clear any existing errors
                        if (typeof this.editable.form.clearError === 'function') {
                            this.editable.form.clearError();
                        }

                        // Submit the form
                        if (typeof this.editable.form.submit === 'function') {
                            this.editable.form.submit();
                        }
                    }, 100);
                };

                this.input.addEventListener('blur', this._blurHandler);
            }
        }

        destroy() {
            // Remove event listeners
            if (this.input) {
                if (this._changeHandler) {
                    this.input.removeEventListener('change', this._changeHandler);
                }
                if (this._blurHandler) {
                    this.input.removeEventListener('blur', this._blurHandler);
                }
            }

            // Clear handler references
            this._changeHandler = null;
            this._blurHandler = null;

            // Call parent destroy
            super.destroy();
        }
    }

    /**
     * HTML5 Input Types
     */
    // Password Input
    class PasswordInput extends AbstractInput {
        init() {
            super.init();
            this.input = document.createElement('input');
            this.input.type = 'password';
            this.input.className = 'form-control';

            if (this.options.placeholder) {
                this.input.placeholder = this.options.placeholder;
            }

            this.element.appendChild(this.input);
        }

        value2html() {
            return '******';
        }

        autosubmit() {
            if (!this.input || !this.options.autosubmit) {
                return;
            }

            // Create handler with proper binding
            this._submitHandler = (e) => {
                if (e.key === 'Enter') {
                    // Clear any existing errors
                    if (this.editable && this.editable.form && 
                        typeof this.editable.form.clearError === 'function') {
                        this.editable.form.clearError();
                    }

                    // Submit the form
                    if (this.editable && this.editable.form && 
                        typeof this.editable.form.submit === 'function') {
                        this.editable.form.submit();
                    }
                }
            };

            // Add event listener
            this.input.addEventListener('keydown', this._submitHandler);

            // Handle blur event if onblur option is set to 'submit'
            if (this.options.onblur === 'submit') {
                this._blurHandler = () => {
                    // Small delay to allow other events to complete
                    setTimeout(() => {
                        // Don't submit if we've lost focus because the form is being hidden
                        if (this.isDestroyed || !this.editable || !this.editable.form) {
                            return;
                        }

                        // Clear any existing errors
                        if (typeof this.editable.form.clearError === 'function') {
                            this.editable.form.clearError();
                        }

                        // Submit the form
                        if (typeof this.editable.form.submit === 'function') {
                            this.editable.form.submit();
                        }
                    }, 100);
                };

                this.input.addEventListener('blur', this._blurHandler);
            }
        }

        destroy() {
            // Remove event listeners
            if (this.input) {
                if (this._submitHandler) {
                    this.input.removeEventListener('keydown', this._submitHandler);
                }
                if (this._blurHandler) {
                    this.input.removeEventListener('blur', this._blurHandler);
                }
            }

            // Clear handler references
            this._submitHandler = null;
            this._blurHandler = null;

            // Call parent destroy
            super.destroy();
        }
    }

    // Email Input
    class EmailInput extends AbstractInput {
        init() {
            super.init();
            this.input = document.createElement('input');
            this.input.type = 'email';
            this.input.className = 'form-control';

            if (this.options.placeholder) {
                this.input.placeholder = this.options.placeholder;
            }

            this.element.appendChild(this.input);
        }

        autosubmit() {
            if (!this.input || !this.options.autosubmit) {
                return;
            }

            // Create handler with proper binding
            this._submitHandler = (e) => {
                if (e.key === 'Enter') {
                    // Clear any existing errors
                    if (this.editable && this.editable.form && 
                        typeof this.editable.form.clearError === 'function') {
                        this.editable.form.clearError();
                    }

                    // Submit the form
                    if (this.editable && this.editable.form && 
                        typeof this.editable.form.submit === 'function') {
                        this.editable.form.submit();
                    }
                }
            };

            // Add event listener
            this.input.addEventListener('keydown', this._submitHandler);

            // Handle blur event if onblur option is set to 'submit'
            if (this.options.onblur === 'submit') {
                this._blurHandler = () => {
                    // Small delay to allow other events to complete
                    setTimeout(() => {
                        // Don't submit if we've lost focus because the form is being hidden
                        if (this.isDestroyed || !this.editable || !this.editable.form) {
                            return;
                        }

                        // Clear any existing errors
                        if (typeof this.editable.form.clearError === 'function') {
                            this.editable.form.clearError();
                        }

                        // Submit the form
                        if (typeof this.editable.form.submit === 'function') {
                            this.editable.form.submit();
                        }
                    }, 100);
                };

                this.input.addEventListener('blur', this._blurHandler);
            }
        }

        destroy() {
            // Remove event listeners
            if (this.input) {
                if (this._submitHandler) {
                    this.input.removeEventListener('keydown', this._submitHandler);
                }
                if (this._blurHandler) {
                    this.input.removeEventListener('blur', this._blurHandler);
                }
            }

            // Clear handler references
            this._submitHandler = null;
            this._blurHandler = null;

            // Call parent destroy
            super.destroy();
        }
    }

    // URL Input
    class UrlInput extends AbstractInput {
        init() {
            super.init();
            this.input = document.createElement('input');
            this.input.type = 'url';
            this.input.className = 'form-control';

            if (this.options.placeholder) {
                this.input.placeholder = this.options.placeholder;
            }

            this.element.appendChild(this.input);
        }

        autosubmit() {
            if (!this.input || !this.options.autosubmit) {
                return;
            }

            // Create handler with proper binding
            this._submitHandler = (e) => {
                if (e.key === 'Enter') {
                    // Clear any existing errors
                    if (this.editable && this.editable.form && 
                        typeof this.editable.form.clearError === 'function') {
                        this.editable.form.clearError();
                    }

                    // Submit the form
                    if (this.editable && this.editable.form && 
                        typeof this.editable.form.submit === 'function') {
                        this.editable.form.submit();
                    }
                }
            };

            // Add event listener
            this.input.addEventListener('keydown', this._submitHandler);

            // Handle blur event if onblur option is set to 'submit'
            if (this.options.onblur === 'submit') {
                this._blurHandler = () => {
                    // Small delay to allow other events to complete
                    setTimeout(() => {
                        // Don't submit if we've lost focus because the form is being hidden
                        if (this.isDestroyed || !this.editable || !this.editable.form) {
                            return;
                        }

                        // Clear any existing errors
                        if (typeof this.editable.form.clearError === 'function') {
                            this.editable.form.clearError();
                        }

                        // Submit the form
                        if (typeof this.editable.form.submit === 'function') {
                            this.editable.form.submit();
                        }
                    }, 100);
                };

                this.input.addEventListener('blur', this._blurHandler);
            }
        }

        destroy() {
            // Remove event listeners
            if (this.input) {
                if (this._submitHandler) {
                    this.input.removeEventListener('keydown', this._submitHandler);
                }
                if (this._blurHandler) {
                    this.input.removeEventListener('blur', this._blurHandler);
                }
            }

            // Clear handler references
            this._submitHandler = null;
            this._blurHandler = null;

            // Call parent destroy
            super.destroy();
        }
    }

    // Tel Input
    class TelInput extends AbstractInput {
        init() {
            super.init();
            this.input = document.createElement('input');
            this.input.type = 'tel';
            this.input.className = 'form-control';

            if (this.options.placeholder) {
                this.input.placeholder = this.options.placeholder;
            }

            this.element.appendChild(this.input);
        }

        autosubmit() {
            if (!this.input || !this.options.autosubmit) {
                return;
            }

            // Create handler with proper binding
            this._submitHandler = (e) => {
                if (e.key === 'Enter') {
                    // Clear any existing errors
                    if (this.editable && this.editable.form && 
                        typeof this.editable.form.clearError === 'function') {
                        this.editable.form.clearError();
                    }

                    // Submit the form
                    if (this.editable && this.editable.form && 
                        typeof this.editable.form.submit === 'function') {
                        this.editable.form.submit();
                    }
                }
            };

            // Add event listener
            this.input.addEventListener('keydown', this._submitHandler);

            // Handle blur event if onblur option is set to 'submit'
            if (this.options.onblur === 'submit') {
                this._blurHandler = () => {
                    // Small delay to allow other events to complete
                    setTimeout(() => {
                        // Don't submit if we've lost focus because the form is being hidden
                        if (this.isDestroyed || !this.editable || !this.editable.form) {
                            return;
                        }

                        // Clear any existing errors
                        if (typeof this.editable.form.clearError === 'function') {
                            this.editable.form.clearError();
                        }

                        // Submit the form
                        if (typeof this.editable.form.submit === 'function') {
                            this.editable.form.submit();
                        }
                    }, 100);
                };

                this.input.addEventListener('blur', this._blurHandler);
            }
        }

        destroy() {
            // Remove event listeners
            if (this.input) {
                if (this._submitHandler) {
                    this.input.removeEventListener('keydown', this._submitHandler);
                }
                if (this._blurHandler) {
                    this.input.removeEventListener('blur', this._blurHandler);
                }
            }

            // Clear handler references
            this._submitHandler = null;
            this._blurHandler = null;

            // Call parent destroy
            super.destroy();
        }
    }

    // Number Input
    class NumberInput extends AbstractInput {
        init() {
            super.init();
            this.input = document.createElement('input');
            this.input.type = 'number';
            this.input.className = 'form-control';

            if (this.options.placeholder) {
                this.input.placeholder = this.options.placeholder;
            }

            if (this.options.min !== undefined) {
                this.input.min = this.options.min;
            }

            if (this.options.max !== undefined) {
                this.input.max = this.options.max;
            }

            if (this.options.step !== undefined) {
                this.input.step = this.options.step;
            }

            this.element.appendChild(this.input);
        }

        str2value(str) {
            if (str === null || str === '') return null;

            const num = Number(str);
            return isNaN(num) ? null : num;
        }

        autosubmit() {
            if (!this.input || !this.options.autosubmit) {
                return;
            }

            // Create handlers with proper binding
            this._submitHandler = (e) => {
                if (e.key === 'Enter') {
                    // Clear any existing errors
                    if (this.editable && this.editable.form && 
                        typeof this.editable.form.clearError === 'function') {
                        this.editable.form.clearError();
                    }

                    // Submit the form
                    if (this.editable && this.editable.form && 
                        typeof this.editable.form.submit === 'function') {
                        this.editable.form.submit();
                    }
                }
            };

            // Add event listeners
            this.input.addEventListener('keydown', this._submitHandler);

            // Also submit on change (when using up/down arrows or input controls)
            this._changeHandler = () => {
                // For number inputs, we may want a small delay to ensure value is settled
                setTimeout(() => {
                    // Clear any existing errors
                    if (this.editable && this.editable.form && 
                        typeof this.editable.form.clearError === 'function') {
                        this.editable.form.clearError();
                    }

                    // Submit the form
                    if (this.editable && this.editable.form && 
                        typeof this.editable.form.submit === 'function') {
                        this.editable.form.submit();
                    }
                }, 100);
            };

            this.input.addEventListener('change', this._changeHandler);

            // Handle blur event if onblur option is set to 'submit'
            if (this.options.onblur === 'submit') {
                this._blurHandler = () => {
                    // Small delay to allow other events to complete
                    setTimeout(() => {
                        // Don't submit if we've lost focus because the form is being hidden
                        if (this.isDestroyed || !this.editable || !this.editable.form) {
                            return;
                        }

                        // Clear any existing errors
                        if (typeof this.editable.form.clearError === 'function') {
                            this.editable.form.clearError();
                        }

                        // Submit the form
                        if (typeof this.editable.form.submit === 'function') {
                            this.editable.form.submit();
                        }
                    }, 100);
                };

                this.input.addEventListener('blur', this._blurHandler);
            }
        }

        destroy() {
            // Remove event listeners
            if (this.input) {
                if (this._submitHandler) {
                    this.input.removeEventListener('keydown', this._submitHandler);
                }
                if (this._changeHandler) {
                    this.input.removeEventListener('change', this._changeHandler);
                }
                if (this._blurHandler) {
                    this.input.removeEventListener('blur', this._blurHandler);
                }
            }

            // Clear handler references
            this._submitHandler = null;
            this._changeHandler = null;
            this._blurHandler = null;

            // Call parent destroy
            super.destroy();
        }
    }

    // Range Input
    class RangeInput extends AbstractInput {
        init() {
            super.init();
            this.input = document.createElement('input');
            this.input.type = 'range';
            this.input.className = 'form-control-range';

            if (this.options.min !== undefined) {
                this.input.min = this.options.min;
            }

            if (this.options.max !== undefined) {
                this.input.max = this.options.max;
            }

            if (this.options.step !== undefined) {
                this.input.step = this.options.step;
            }

            // Create output to display the current value
            this.output = document.createElement('output');
            this.output.style.marginLeft = '10px';

            // Create container for range and output
            this.rangeContainer = document.createElement('div');
            this.rangeContainer.className = 'd-flex align-items-center';

            this.rangeContainer.appendChild(this.input);
            this.rangeContainer.appendChild(this.output);
            this.element.appendChild(this.rangeContainer);

            // Update output when input changes
            const updateOutput = () => {
                if (this.output && this.input) {
                    this.output.textContent = this.input.value;
                }
            };

            this.input.addEventListener('input', updateOutput);
            this._inputHandler = updateOutput; // Store for cleanup

            // Initial update
            updateOutput();
        }

        value2input(value) {
            if (!this.input) return;

            this.input.value = value !== null && value !== undefined ? String(value) : '';

            // Update output
            if (this.output) {
                this.output.textContent = this.input.value;
            }
        }

        str2value(str) {
            if (str === null || str === '') return null;

            const num = Number(str);
            return isNaN(num) ? null : num;
        }

        autosubmit() {
            if (!this.input || !this.options.autosubmit) {
                return;
            }

            // For range input, submit when value changes (slider stops)
            this._changeHandler = () => {
                // Clear any existing errors
                if (this.editable && this.editable.form && 
                    typeof this.editable.form.clearError === 'function') {
                    this.editable.form.clearError();
                }

                // Submit the form
                if (this.editable && this.editable.form && 
                    typeof this.editable.form.submit === 'function') {
                    this.editable.form.submit();
                }
            };

            // Add event listener - 'change' fires when slider stops
            this.input.addEventListener('change', this._changeHandler);

            // Handle blur event if onblur option is set to 'submit'
            if (this.options.onblur === 'submit') {
                this._blurHandler = () => {
                    // Small delay to allow other events to complete
                    setTimeout(() => {
                        // Don't submit if we've lost focus because the form is being hidden
                        if (this.isDestroyed || !this.editable || !this.editable.form) {
                            return;
                        }

                        // Clear any existing errors
                        if (typeof this.editable.form.clearError === 'function') {
                            this.editable.form.clearError();
                        }

                        // Submit the form
                        if (typeof this.editable.form.submit === 'function') {
                            this.editable.form.submit();
                        }
                    }, 100);
                };

                this.input.addEventListener('blur', this._blurHandler);
            }
        }

        destroy() {
            // Remove event listeners
            if (this.input) {
                if (this._changeHandler) {
                    this.input.removeEventListener('change', this._changeHandler);
                }
                if (this._blurHandler) {
                    this.input.removeEventListener('blur', this._blurHandler);
                }
            }

            // Clear handler references
            this._changeHandler = null;
            this._blurHandler = null;

            // Call parent destroy
            super.destroy();
        }
    }

    /**
     * Utility functions
     */
    const Utils = {
        // Try to parse JSON string
        tryParseJson: function(str, silent = false) {
            if (typeof str !== 'string') {
                return str;
            }
            try {
                return JSON.parse(str);
            } catch (e) {
                if (!silent) {
                    console.error('Error parsing JSON:', e);
                }
                return str;
            }
        },
        
        // Get value from object by path
        getValueByPath: function(obj, path) {
            if (!obj || !path) {
                return null;
            }
            const parts = path.split('.');
            let current = obj;
            for (let i = 0; i < parts.length; i++) {
                if (current === null || current === undefined) {
                    return null;
                }
                current = current[parts[i]];
            }
            return current;
        },
        
        // Set CSS styles for an element
        css: function(element, styles) {
            if (!element || !styles) {
                return;
            }
            Object.keys(styles).forEach(key => {
                element.style[key] = styles[key];
            });
        },
        
        // Check if device is touch device
        isTouchDevice: function() {
            return ('ontouchstart' in window) ||
                (navigator.maxTouchPoints > 0) ||
                (navigator.msMaxTouchPoints > 0);
        },
        
        // Generate a unique ID
        generateId: function(prefix = 'editable') {
            return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
        }
    };

    /**
     * Public API
     */
    // Initialize editable on an element
    function editable(selector, options = {}) {
        let elements;
        
        try {
            if (typeof selector === 'string') {
                elements = document.querySelectorAll(selector);
            } else if (selector instanceof HTMLElement) {
                elements = [selector];
            } else if (selector instanceof NodeList || Array.isArray(selector)) {
                elements = selector;
            } else {
                throw new Error('Invalid selector');
            }
            
            const instances = [];
            
            elements.forEach(element => {
                // If element already has editable instance, destroy it
                if (element.editable && typeof element.editable.destroy === 'function') {
                    element.editable.destroy();
                }
                
                // Create new editable instance
                try {
                    const instance = new Editable(element, options);
                    instances.push(instance);
                } catch (e) {
                    console.error(`Error creating editable instance for element:`, element, e);
                }
            });
            
            return instances.length === 1 ? instances[0] : instances;
        } catch (e) {
            console.error('Error initializing editable:', e);
            return [];
        }
    }

    // Auto-initialize editables with data-editable attribute
    document.addEventListener('DOMContentLoaded', () => {
        try {
            const editableElements = document.querySelectorAll('[data-editable]');
            
            editableElements.forEach(element => {
                // Get options from data attributes
                const options = {};
                const dataset = element.dataset;
                
                // Extract options from data attributes
                if (dataset.type) options.type = dataset.type;
                if (dataset.url) options.url = dataset.url;
                if (dataset.pk) options.pk = dataset.pk;
                if (dataset.name) options.name = dataset.name;
                if (dataset.value) options.value = dataset.value;
                if (dataset.placement) options.placement = dataset.placement;
                if (dataset.title) options.title = dataset.title;
                if (dataset.mode) options.mode = dataset.mode;
                
                // Check for JSON options
                if (dataset.source) {
                    options.source = Utils.tryParseJson(dataset.source);
                }
                if (dataset.params) {
                    options.params = Utils.tryParseJson(dataset.params);
                }
                
                // Create editable
                try {
                    editable(element, options);
                } catch (e) {
                    console.error(`Error initializing editable on element with data attributes:`, element, e);
                }
            });
        } catch (e) {
            console.error('Error during auto-initialization of editables:', e);
        }
    });

    // Expose to global scope
    window.Editable = Editable;
    window.editable = editable;
})();
