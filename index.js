/**
 * Bootstrap 5 Editable
 * In-place editing with Bootstrap 5 (pure JavaScript implementation)
 */
(function() {
    'use strict';
    /**
     * Main Editable class
     */
    class Editable {
        constructor(element, options = {}) {
            if (typeof element === 'string') {
                element = document.querySelector(element);
            }
            if (!element || !(element instanceof HTMLElement)) {
                throw new Error('Element must be a valid DOM node');
            }
            this.element = element;
            // Default options
            this.options = {
                type: 'text',
                pk: null,
                value: null,
                url: null,
                source: null,
                showbuttons: true,
                onblur: 'cancel',
                enableEscape: true, 
                enableEnter: true, 
                mode: 'popup',
                emptytext: 'Empty',
                placeholder: '',
                disabled: false,
                toggle: 'click',
                validate: null,
                success: null,
                error: null,
                ajaxOptions: {},
                name: null,
                params: {},
                send: 'auto',
                autosubmit: false,
                display: null,
                ...options
            };
            
            // Extract name from ID if not defined
            if (!this.options.name && this.element.id) {
                this.options.name = this.element.id;
            }
            
            // Extract value from element content if not defined
            if (this.options.value === null) {
                this.options.value = this.element.textContent.trim();
            }
            
            // Initialize active state tracking
            this.isActive = false;
            this.isDestroyed = false;
            
            // Initialize the input
            this.input = this.createInput(this.options.type);
            
            // Create container
            this.container = this.options.mode === 'inline' ?
                new InlineContainer(this) :
                new PopoverContainer(this);
            
            // Create form
            this.form = new EditableForm(this);
            
            // Store reference to this instance in DOM element
            this.element.editable = this;
            
            // Initialize
            this.init();
        }
        
        init() {
            // Add editable class
            this.element.classList.add('editable');
            
            // Handle empty state
            this.handleEmpty();
            
            // Add event handlers
            this.attachHandlers();
            
            // If disabled, apply disabled state
            if (this.options.disabled) {
                this.disable();
            }
        }
        
        createInput(type) {
            const inputTypes = {
                text: TextInput,
                textarea: TextareaInput,
                select: SelectInput,
                checklist: ChecklistInput,
                date: DateInput,
                datetime: DateTimeInput,
                password: PasswordInput,
                email: EmailInput,
                url: UrlInput,
                tel: TelInput,
                number: NumberInput,
                range: RangeInput
            };
            const InputClass = inputTypes[type] || TextInput;
            return new InputClass(this);
        }
        
        attachHandlers() {
            if (this.options.toggle !== 'manual') {
                this.element.classList.add('text-primary', 'cursor-pointer', 'text-decoration-underline');
                
                // Create a bound handler function to maintain context
                this.toggleHandler = (e) => {
                    if (!this.isDestroyed && !this.options.disabled) {
                        e.preventDefault();
                        e.stopPropagation();
                        if (this.options.toggle === 'mouseenter') {
                            this.show();
                        } else {
                            this.toggle();
                        }
                    }
                };
                
                this.element.addEventListener(this.options.toggle, this.toggleHandler);
            }
        }
        
        show() {
            if (this.isDestroyed || this.options.disabled || this.isActive) return;
            
            // Set active state
            this.isActive = true;
            
            // Close other editable elements if needed
            if (this.options.mode === 'popup') {
                document.querySelectorAll('.editable-open').forEach(el => {
                    if (el !== this.element && el.editable) {
                        el.editable.hide();
                    }
                });
            }
            
            this.element.classList.add('editable-open');
            
            // Show container first
            if (this.container && typeof this.container.show === 'function') {
                this.container.show();
                
                // Then render form - this sequence is important
                if (this.form && typeof this.form.render === 'function') {
                    this.form.render();
                }
            }
            
            this.triggerEvent('shown');
        }
        
        hide() {
            if (this.isDestroyed) return;
            
            // Update state
            this.isActive = false;
            this.element.classList.remove('editable-open');
            
            // Hide container
            if (this.container && typeof this.container.hide === 'function') {
                this.container.hide();
            }
            
            // Allow form to clean up
            if (this.form && typeof this.form.onHide === 'function') {
                this.form.onHide();
            }
            
            this.triggerEvent('hidden');
        }
        
        toggle() {
            if (this.element.classList.contains('editable-open')) {
                this.hide();
            } else {
                this.show();
            }
        }
        
        enable() {
            this.options.disabled = false;
            this.element.classList.remove('editable-disabled');
            this.handleEmpty();
        }
        
        disable() {
            this.options.disabled = true;
            this.element.classList.add('editable-disabled');
            this.hide();
            this.handleEmpty();
        }
        
        toggleDisabled() {
            if (this.options.disabled) {
                this.enable();
            } else {
                this.disable();
            }
        }
        
        handleEmpty() {
            const isEmpty = !this.element.textContent.trim();
            if (isEmpty) {
                if (!this.options.disabled) {
                    this.element.innerHTML = this.options.emptytext;
                    this.element.classList.add('editable-empty');
                } else {
                    this.element.innerHTML = '';
                }
            } else if (this.element.classList.contains('editable-empty')) {
                this.element.classList.remove('editable-empty');
            }
        }
        
        setValue(value, convert = false) {
            this.options.value = convert ? this.input.str2value(value) : value;
            let displayValue;
            
            if (typeof this.options.display === 'function') {
                displayValue = this.options.display.call(this.element, this.options.value);
            } else if (this.input && typeof this.input.value2html === 'function') {
                displayValue = this.input.value2html(this.options.value);
            }
            
            if (displayValue !== undefined) {
                this.element.innerHTML = displayValue;
            }
            
            this.handleEmpty();
            this.triggerEvent('update', {
                value: this.options.value
            });
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

                // Prepare data
                let data = {
                    name: this.options.name || '',
                    value: submitValue,
                    pk: pk
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
                        // Check if the response is ok (status in the range 200-299)
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
                                // Don't hide the form or update the value
                                return;
                            } 
                            else if (responseData.status === "success") {
                                // Display success toast if toastr is available
                                if (typeof toastr !== 'undefined') {
                                    // Use toast notification for success
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

                                // Set new value
                                this.setValue(value);

                                // Hide form
                                this.hide();

                                // Trigger save event
                                this.triggerEvent('save', {
                                    newValue: value,
                                    submitValue: submitValue,
                                    response: responseData
                                });

                                return;
                            }
                        }

                        // Legacy support for custom success callback
                        if (typeof this.options.success === 'function') {
                            const result = this.options.success.call(this.element, responseData, value);
                            if (result === false) {
                                // Keep form open and don't set value
                                return;
                            }
                            if (typeof result === 'string') {
                                // Show error
                                this.form.error(result);
                                return;
                            }
                            if (result && typeof result === 'object' && result.hasOwnProperty('newValue')) {
                                // Override submitted value
                                value = result.newValue;
                            }
                        }

                        // Default success behavior if no specific status handling occurred
                        this.setValue(value);
                        this.hide();

                        // Trigger save event
                        this.triggerEvent('save', {
                            newValue: value,
                            submitValue: submitValue,
                            response: responseData
                        });
                    })
                    .catch(error => {
                        this.container.hideLoading();

                        console.error('Fetch error:', error);

                        // Create a user-friendly error message based on the error
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
                            // Use custom error message if returned
                            if (customErrorMsg) {
                                userErrorMsg = customErrorMsg;
                            }
                        }

                        // Make sure the form is still available
                        if (this.form && typeof this.form.error === 'function') {
                            // Show error in the form
                            this.form.error(userErrorMsg);
                        } else {
                            // Fallback if form is not available
                            console.error('Form not available to display error:', userErrorMsg);

                            // Display toast error notification if toastr is available
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
                this.setValue(value);
                this.hide();

                // Trigger save event
                this.triggerEvent('save', {
                    newValue: value,
                    submitValue: submitValue
                });
            }
        }
        
        validate(value) {
            if (typeof this.options.validate === 'function') {
                return this.options.validate.call(this.element, value);
            }
            return null;
        }
        
        triggerEvent(eventName, params = {}) {
            if (this.isDestroyed) return;
            
            const event = new CustomEvent(`editable.${eventName}`, {
                bubbles: true,
                detail: {
                    ...params,
                    editable: this
                }
            });
            this.element.dispatchEvent(event);
        }
        
        destroy() {
            // Mark as destroyed to prevent further operations
            this.isDestroyed = true;
            this.isActive = false;
            
            // Remove event listeners
            if (this.options.toggle !== 'manual' && this.toggleHandler) {
                this.element.removeEventListener(this.options.toggle, this.toggleHandler);
            }
            
            // Hide and destroy container
            if (this.container) {
                if (typeof this.container.hide === 'function') {
                    this.container.hide();
                }
                if (typeof this.container.destroy === 'function') {
                    this.container.destroy();
                }
            }
            
            // Allow form to clean up
            if (this.form && typeof this.form.destroy === 'function') {
                this.form.destroy();
            }
            
            // Clean up input
            if (this.input && typeof this.input.destroy === 'function') {
                this.input.destroy();
            }
            
            // Remove classes
            this.element.classList.remove(
                'editable', 'editable-open', 'editable-disabled',
                'text-primary', 'cursor-pointer', 'text-decoration-underline'
            );
            
            // Remove reference to editable instance
            delete this.element.editable;
            
            // Clear references
            this.element = null;
            this.container = null;
            this.form = null;
            this.input = null;
        }
    }

    /**
     * EditableForm class - FIXED
     */
    class EditableForm {
        constructor(editable) {
            this.editable = editable;
            this.options = editable.options;
            this.input = editable.input;
            
            // Initialize properties
            this.element = null;
            this.errorContainer = null;
            this.isDestroyed = false;
            this.isSubmitting = false;
            this.submitHandlers = [];
            
            // Bind methods to preserve context
            this.submit = this.submit.bind(this);
            this.error = this.error.bind(this);
            this.onHide = this.onHide.bind(this);
        }
        
        render() {
            // Reset state
            this.isDestroyed = false;
            this.isSubmitting = false;
            
            // Create form element
            this.element = document.createElement('form');
            this.element.className = 'editable-form';
            
            // Create input container
            const inputContainer = document.createElement('div');
            inputContainer.classList.add('editable-input', 'w-100');
            
            try {
                // Render input
                if (this.input && typeof this.input.render === 'function') {
                    this.input.render();
                    
                    // Append input to container if it exists
                    if (this.input.element) {
                        inputContainer.appendChild(this.input.element);
                    }
                }
            } catch (e) {
                console.error('Error rendering input:', e);
            }
            
            // Append input container to form
            this.element.appendChild(inputContainer);
            
            // Create error container BEFORE buttons
            this.errorContainer = document.createElement('div');
            this.errorContainer.className = 'editable-error text-danger d-none';
            
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
                
                // Create a stable event handler
                const cancelHandler = (e) => {
                    e.preventDefault();
                    if (!this.isDestroyed && this.editable && typeof this.editable.hide === 'function') {
                        this.editable.hide();
                        this.editable.triggerEvent('cancel');
                    }
                };
                
                // Store handler reference for cleanup
                this.cancelHandler = cancelHandler;
                
                // Add event listener for cancel button
                cancelButton.addEventListener('click', cancelHandler);
                
                // Append buttons container to form
                this.element.appendChild(buttonsContainer);
            }
            
            // Append error container AFTER buttons
            this.element.appendChild(this.errorContainer);
            
            // Create a stable submit handler
            const submitHandler = (e) => {
                if (e) {
                    e.preventDefault();
                }
                
                // Prevent multiple submissions
                if (this.isSubmitting) {
                    return;
                }
                
                // Make sure the form is still valid before submitting
                if (!this.isDestroyed && this.element) {
                    this.submit();
                }
            };
            
            // Store handler reference for cleanup
            this.submitHandler = submitHandler;
            
            // Add to handlers array to track all handlers
            this.submitHandlers.push(submitHandler);
            
            // Add form submit handler
            this.element.addEventListener('submit', submitHandler);
            
            // Add form to container
            if (this.editable.container && typeof this.editable.container.setContent === 'function') {
                this.editable.container.setContent(this.element);
            } else {
                console.error('Container is missing or setContent method is not available');
            }
            
            // Set up autosubmit if no buttons are shown
            if (!this.options.showbuttons && this.input) {
                if (typeof this.input.autosubmit === 'function') {
                    this.input.autosubmit();
                }
            }
            
            // Set initial value
            const value = this.editable.options.value !== null ? 
                this.editable.options.value : this.editable.options.defaultValue;
            
            if (this.input && typeof this.input.value2input === 'function') {
                this.input.value2input(value);
            }
            
            // Activate input (focus) using setTimeout to ensure DOM is ready
            if (this.input && typeof this.input.activate === 'function') {
                setTimeout(() => {
                    if (!this.isDestroyed && this.input) {
                        this.input.activate();
                    }
                }, 10); // Slightly longer timeout for better compatibility
            }
        }
        
        submit() {
            // Safety check - verify form is still valid before proceeding
            if (this.isDestroyed || this.isSubmitting || !this.element || !this.input) {
                console.warn('Submit called on invalid form state. Form destroyed or elements missing.');
                return;
            }
            
            // Set flag to prevent multiple submissions
            this.isSubmitting = true;
            
            try {
                // Get value from input
                const newValue = this.input.input2value();
                
                // Validate value
                let error = null;
                if (this.editable && typeof this.editable.validate === 'function') {
                    error = this.editable.validate(newValue);
                }
                
                if (error) {
                    this.error(error);
                    this.isSubmitting = false;
                    return;
                }
                
                // Clear any errors
                this.error(false);
                
                // Save value - check if editable still exists
                if (this.editable && typeof this.editable.save === 'function') {
                    this.editable.save(newValue);
                    // Note: isSubmitting will be reset when the form is hidden or when a new form is rendered
                } else {
                    console.warn('Cannot save value - editable instance is missing or invalid');
                    this.isSubmitting = false;
                }
            } catch (e) {
                console.error('Error during form submission:', e);
                this.error('An unexpected error occurred during submission');
                this.isSubmitting = false;
            }
        }
        
        error(msg) {
            // Safety check - verify both form and error container exist
            if (this.isDestroyed || !this.element || !this.errorContainer) {
                return;
            }
            
            try {
                if (msg === false) {
                    // Clearing error
                    this.errorContainer.classList.add('d-none');
                    this.errorContainer.textContent = '';
                    if (this.element) {
                        this.element.classList.remove('text-danger', 'is-invalid');
                    }
                } else {
                    // Showing error
                    this.errorContainer.classList.remove('d-none');
                    this.errorContainer.textContent = msg;
                    if (this.element) {
                        this.element.classList.add('text-danger', 'is-invalid');
                    }
                }
            } catch (e) {
                console.debug('Error updating form error state:', e);
            }
        }
        
        // Handle form hide event
        onHide() {
            // Reset submission state when form is hidden
            this.isSubmitting = false;
        }
        
        // Clean up resources when destroying the form
        destroy() {
            this.isDestroyed = true;
            this.isSubmitting = false;
            
            // Remove event listeners
            if (this.element) {
                // Remove all submit handlers
                this.submitHandlers.forEach(handler => {
                    this.element.removeEventListener('submit', handler);
                });
                
                // Find and remove cancel button handler
                const cancelButton = this.element.querySelector('.editable-cancel');
                if (cancelButton && this.cancelHandler) {
                    cancelButton.removeEventListener('click', this.cancelHandler);
                }
            }
            
            // Clear all handlers arrays
            this.submitHandlers = [];
            
            // Clear references
            this.element = null;
            this.errorContainer = null;
            this.cancelHandler = null;
            this.submitHandler = null;
        }
    }

    /**
     * Base Input class
     */
    class AbstractInput {
        constructor(editable) {
            this.editable = editable;
            this.options = editable.options;
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
        
        destroy() {
            this.isDestroyed = true;
            
            // Remove event listeners if needed
            if (this.input) {
                // Child classes may need to override this to remove specific listeners
            }
            
            // Clear references
            this.input = null;
            this.element = null;
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
        
        // Add common event handlers setup
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
        
        // Helper method to check if container is visible
        isVisible() {
            return !this.isDestroyed && this.element &&
                (this.element.style.display === 'block' ||
                 this.element.classList.contains('show'));
        }
        
        // Clean up event handlers
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
        
        // Method to be called on destroy
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
            // To be implemented by child classes
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
        
                hide() {
            if (this.isDestroyed) return;
            
            this.element.classList.remove('show');
            
            // Notify form about hiding
            if (this.editable && this.editable.form && 
                typeof this.editable.form.onHide === 'function') {
                this.editable.form.onHide();
            }
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
        
        hide() {
            if (this.isDestroyed || !this.element || !this.editable || !this.editable.element) {
                return;
            }
            
            // Show the editable element
            this.editable.element.style.display = '';
            
            // Hide container
            this.element.style.display = 'none';
            
            // Notify form about hiding
            if (this.editable.form && typeof this.editable.form.onHide === 'function') {
                this.editable.form.onHide();
            }
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
            if (this.isDestroyed || !this.input || !this.options.autosubmit) {
                return;
            }
            
            // Create handler with proper binding
            this._submitHandler = (e) => {
                if (e.key === 'Enter') {
                    if (this.editable && this.editable.form && 
                        typeof this.editable.form.submit === 'function') {
                        this.editable.form.submit();
                    }
                }
            };
            
            // Add event listener
            this.input.addEventListener('keydown', this._submitHandler);
        }
        
        destroy() {
            // Remove event listeners before calling super
            if (this.input) {
                if (this._inputHandler) {
                    this.input.removeEventListener('input', this._inputHandler);
                }
                if (this._submitHandler) {
                    this.input.removeEventListener('keydown', this._submitHandler);
                }
            }
            
            if (this.clearButton && this._clearHandler) {
                this.clearButton.removeEventListener('click', this._clearHandler);
            }
            
            // Call parent destroy
            super.destroy();
            
            // Clear button reference
            this.clearButton = null;
            
            // Clear handler references
            this._inputHandler = null;
            this._clearHandler = null;
            this._submitHandler = null;
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
            if (this.isDestroyed || !this.input || !this.options.autosubmit) {
                return;
            }
            
            // Create handler with proper binding
            this._submitHandler = (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    if (this.editable && this.editable.form && 
                        typeof this.editable.form.submit === 'function') {
                        this.editable.form.submit();
                    }
                }
            };
            
            // Add event listener
            this.input.addEventListener('keydown', this._submitHandler);
        }
        
        destroy() {
            // Remove event listeners before calling super
            if (this.input && this._submitHandler) {
                this.input.removeEventListener('keydown', this._submitHandler);
            }
            
            // Call parent destroy
            super.destroy();
            
            // Clear handler reference
            this._submitHandler = null;
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
            if (this.isDestroyed || !this.input || !this.options.autosubmit) {
                return;
            }
            
            // Create handler with proper binding
            this._changeHandler = () => {
                if (this.editable && this.editable.form && 
                    typeof this.editable.form.submit === 'function') {
                    this.editable.form.submit();
                }
            };
            
            // Add event listener
            this.input.addEventListener('change', this._changeHandler);
        }
        
        destroy() {
            // Remove event listeners before calling super
            if (this.input && this._changeHandler) {
                this.input.removeEventListener('change', this._changeHandler);
            }
            
            // Call parent destroy
            super.destroy();
            
            // Clear references
            this.sourceData = null;
            this._changeHandler = null;
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
            // Checklist doesn't typically auto-submit
        }

        destroy() {
            // Clear arrays
            this.inputs = [];
            this.sourceData = null;

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
            if (!this.input || !this.options.autosubmit) return;

            const handler = () => {
                if (this.editable && this.editable.form && 
                    typeof this.editable.form.submit === 'function') {
                    this.editable.form.submit();
                }
            };

            this.input.addEventListener('change', handler);
            this._changeHandler = handler; // Store for cleanup
        }

        destroy() {
            if (this.input && this._changeHandler) {
                this.input.removeEventListener('change', this._changeHandler);
            }

            this._changeHandler = null;
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
            if (!this.input || !this.options.autosubmit) return;

            const handler = () => {
                if (this.editable && this.editable.form && 
                    typeof this.editable.form.submit === 'function') {
                    this.editable.form.submit();
                }
            };

            this.input.addEventListener('change', handler);
            this._changeHandler = handler; // Store for cleanup
        }

        destroy() {
            if (this.input && this._changeHandler) {
                this.input.removeEventListener('change', this._changeHandler);
            }

            this._changeHandler = null;
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
            if (!this.input || !this.options.autosubmit) return;

            const handler = (e) => {
                if (e.key === 'Enter' && this.editable && this.editable.form && 
                    typeof this.editable.form.submit === 'function') {
                    this.editable.form.submit();
                }
            };

            this.input.addEventListener('keydown', handler);
            this._keydownHandler = handler; // Store for cleanup
        }

        destroy() {
            if (this.input && this._keydownHandler) {
                this.input.removeEventListener('keydown', this._keydownHandler);
            }

            this._keydownHandler = null;
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
            if (!this.input || !this.options.autosubmit) return;

            const handler = (e) => {
                if (e.key === 'Enter' && this.editable && this.editable.form && 
                    typeof this.editable.form.submit === 'function') {
                    this.editable.form.submit();
                }
            };

            this.input.addEventListener('keydown', handler);
            this._keydownHandler = handler; // Store for cleanup
        }

        destroy() {
            if (this.input && this._keydownHandler) {
                this.input.removeEventListener('keydown', this._keydownHandler);
            }

            this._keydownHandler = null;
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
            if (!this.input || !this.options.autosubmit) return;

            const handler = (e) => {
                if (e.key === 'Enter' && this.editable && this.editable.form && 
                    typeof this.editable.form.submit === 'function') {
                    this.editable.form.submit();
                }
            };

            this.input.addEventListener('keydown', handler);
            this._keydownHandler = handler; // Store for cleanup
        }

        destroy() {
            if (this.input && this._keydownHandler) {
                this.input.removeEventListener('keydown', this._keydownHandler);
            }

            this._keydownHandler = null;
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
            if (!this.input || !this.options.autosubmit) return;

            const handler = (e) => {
                if (e.key === 'Enter' && this.editable && this.editable.form && 
                    typeof this.editable.form.submit === 'function') {
                    this.editable.form.submit();
                }
            };

            this.input.addEventListener('keydown', handler);
            this._keydownHandler = handler; // Store for cleanup
        }

        destroy() {
            if (this.input && this._keydownHandler) {
                this.input.removeEventListener('keydown', this._keydownHandler);
            }

            this._keydownHandler = null;
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
            if (!this.input || !this.options.autosubmit) return;

            const handler = (e) => {
                if (e.key === 'Enter' && this.editable && this.editable.form && 
                    typeof this.editable.form.submit === 'function') {
                    this.editable.form.submit();
                }
            };

            this.input.addEventListener('keydown', handler);
            this._keydownHandler = handler; // Store for cleanup
        }

        destroy() {
            if (this.input && this._keydownHandler) {
                this.input.removeEventListener('keydown', this._keydownHandler);
            }

            this._keydownHandler = null;
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
            if (!this.input || !this.options.autosubmit) return;

            const handler = () => {
                if (this.editable && this.editable.form && 
                    typeof this.editable.form.submit === 'function') {
                    this.editable.form.submit();
                }
            };

            this.input.addEventListener('change', handler);
            this._changeHandler = handler; // Store for cleanup
        }

        destroy() {
            if (this.input) {
                if (this._inputHandler) {
                    this.input.removeEventListener('input', this._inputHandler);
                }

                if (this._changeHandler) {
                    this.input.removeEventListener('change', this._changeHandler);
                }
            }

            this._inputHandler = null;
            this._changeHandler = null;
            this.output = null;
            this.rangeContainer = null;

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
