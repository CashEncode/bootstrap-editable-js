/**
 * Bootstrap 5 Editable v1.0
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

      // Initialize the input
      this.input = this.createInput(this.options.type);
      
      // Create container
      this.container = this.options.mode === 'inline' ? 
        new InlineContainer(this) : 
        new PopoverContainer(this);
      
      // Create form
      this.form = new EditableForm(this);
      
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
        this.element.classList.add('editable-click');
        
        this.element.addEventListener(this.options.toggle, (e) => {
          if (!this.options.disabled) {
            e.preventDefault();
            e.stopPropagation();
            
            if (this.options.toggle === 'mouseenter') {
              this.show();
            } else {
              this.toggle();
            }
          }
        });
      }
    }

    show() {
      if (this.options.disabled) return;
      
      // Close other editable elements if needed
      if (this.options.mode === 'popup') {
        document.querySelectorAll('.editable-open').forEach(el => {
          if (el !== this.element) {
            el.editable && el.editable.hide();
          }
        });
      }
      
      this.element.classList.add('editable-open');
      this.container.show();
      this.form.render();
    }

    hide() {
      this.element.classList.remove('editable-open');
      this.container.hide();
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
      } else {
        displayValue = this.input.value2html(this.options.value);
      }
      
      if (displayValue !== undefined) {
        this.element.innerHTML = displayValue;
      }
      
      this.handleEmpty();
      this.triggerEvent('update', {value: this.options.value});
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
          data = {...data, ...this.options.params(data)};
        } else {
          data = {...data, ...this.options.params};
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
            if (!response.ok) {
              throw new Error(response.statusText);
            }
            return response.json();
          })
          .then(responseData => {
            this.container.hideLoading();
            
            // Run success callback
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
          })
          .catch(error => {
            this.container.hideLoading();
            
            // Run error callback
            let errorMsg = error.message;
            if (typeof this.options.error === 'function') {
              errorMsg = this.options.error.call(this.element, error, value) || errorMsg;
            }
            
            // Show error
            this.form.error(errorMsg);
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
      const event = new CustomEvent(`editable.${eventName}`, {
        bubbles: true,
        detail: {...params, editable: this}
      });
      
      this.element.dispatchEvent(event);
    }
  }

  /**
   * Base Input class
   */
  class AbstractInput {
    constructor(editable) {
      this.editable = editable;
      this.options = editable.options;
      this.init();
    }
    
    init() {
      // Create element
      this.element = document.createElement('div');
      this.element.className = 'editable-input';
    }
    
    render() {
      // To be implemented by child classes
    }
    
    activate() {
      // Focus on the input
      if (this.input) {
        this.input.focus();
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
      if (this.input) {
        this.input.value = value !== null && value !== undefined ? String(value) : '';
      }
    }
    
    input2value() {
      return this.input ? this.input.value : null;
    }
    
    clear() {
      if (this.input) {
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
  }

  /**
   * Text Input
   */
  class TextInput extends AbstractInput {
    init() {
      super.init();
      
      this.input = document.createElement('input');
      this.input.type = 'text';
      this.input.className = 'form-control';
      
      if (this.options.placeholder) {
        this.input.placeholder = this.options.placeholder;
      }
      
      this.element.appendChild(this.input);
      
      // Add clear button if needed
      if (this.options.clear !== false) {
        this.createClearButton();
      }
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
      
      this.element.style.position = 'relative';
      this.element.appendChild(this.clearButton);
      
      // Add event listeners
      this.input.addEventListener('input', () => {
        this.toggleClear();
      });
      
      this.clearButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.clear();
        this.input.focus();
      });
    }
    
    toggleClear() {
      if (this.clearButton) {
        this.clearButton.style.display = this.input.value.length ? 'block' : 'none';
      }
    }
    
    activate() {
      super.activate();
      this.toggleClear();
    }
    
    clear() {
      super.clear();
      this.toggleClear();
    }
    
    autosubmit() {
      if (this.options.autosubmit) {
        this.input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            this.editable.form.submit();
          }
        });
      }
    }
  }

  /**
   * Textarea Input
   */
  class TextareaInput extends AbstractInput {
    init() {
      super.init();
      
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
      
      this.element.appendChild(this.input);
    }
    
    autosubmit() {
      if (this.options.autosubmit) {
        this.input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && e.ctrlKey) {
            this.editable.form.submit();
          }
        });
      }
    }
  }

  /**
   * Select Input
   */
  class SelectInput extends AbstractInput {
    init() {
      super.init();
      
      this.input = document.createElement('select');
      this.input.className = 'form-select';
      
      this.element.appendChild(this.input);
      
      // Process source
      this.processSource();
    }
    
    async processSource() {
      let source = this.options.source;
      
      if (typeof source === 'function') {
        source = source.call(this.editable.element);
      }
      
      if (typeof source === 'string') {
        // It's a URL
        try {
          const response = await fetch(source);
          source = await response.json();
        } catch(error) {
          console.error('Error loading source:', error);
          source = [];
        }
      }
      
      this.sourceData = this.convertSource(source);
    }
    
    convertSource(source) {
      if (!source) return [];
      
      // Convert to standard format: [{value: '1', text: 'Option 1'}, ...]
      if (Array.isArray(source)) {
        return source.map(item => {
          if (typeof item === 'object' && item !== null) {
            if (item.value !== undefined && item.text !== undefined) {
              return item;
            } else if (item.id !== undefined && item.text !== undefined) {
              return { value: item.id, text: item.text };
            } else {
              // Take first property as value, second as text
              const keys = Object.keys(item);
              if (keys.length >= 2) {
                return { value: item[keys[0]], text: item[keys[1]] };
              }
            }
          }
          return { value: item, text: item };
        });
      } else if (typeof source === 'object' && source !== null) {
        // Object like {1: 'Option 1', 2: 'Option 2'}
        return Object.entries(source).map(([value, text]) => ({
          value,
          text
        }));
      }
      
      return [];
    }
    
    render() {
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
      
      // Set current value
      this.value2input(this.editable.options.value);
    }
    
    value2input(value) {
      if (this.input) {
        this.input.value = value !== null && value !== undefined ? String(value) : '';
      }
    }
    
    value2html(value) {
      if (value === null || value === undefined) return '';
      
      const item = this.sourceData && this.sourceData.find(item => 
        String(item.value) === String(value)
      );
      
      return item ? item.text : value;
    }
    
    autosubmit() {
      if (this.options.autosubmit) {
        this.input.addEventListener('change', () => {
          this.editable.form.submit();
        });
      }
    }
  }

  /**
   * Checklist Input
   */
  class ChecklistInput extends AbstractInput {
    init() {
      super.init();
      
      this.element.className = 'editable-checklist';
      
      // Process source
      this.processSource();
    }
    
    async processSource() {
      let source = this.options.source;
      
      if (typeof source === 'function') {
        source = source.call(this.editable.element);
      }
      
      if (typeof source === 'string') {
        // It's a URL
        try {
          const response = await fetch(source);
          source = await response.json();
        } catch(error) {
          console.error('Error loading source:', error);
          source = [];
        }
      }
      
      this.sourceData = this.convertSource(source);
    }
    
    convertSource(source) {
      // Same as SelectInput
      if (!source) return [];
      
      if (Array.isArray(source)) {
        return source.map(item => {
          if (typeof item === 'object' && item !== null) {
            if (item.value !== undefined && item.text !== undefined) {
              return item;
            } else if (item.id !== undefined && item.text !== undefined) {
              return { value: item.id, text: item.text };
            } else {
              const keys = Object.keys(item);
              if (keys.length >= 2) {
                return { value: item[keys[0]], text: item[keys[1]] };
              }
            }
          }
          return { value: item, text: item };
        });
      } else if (typeof source === 'object' && source !== null) {
        return Object.entries(source).map(([value, text]) => ({
          value,
          text
        }));
      }
      
      return [];
    }
    
    render() {
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
      
      // Set current value
      this.value2input(this.editable.options.value);
    }
    
    value2input(value) {
      if (!this.inputs || !this.inputs.length) return;
      
      // Normalize value to array
      const values = Array.isArray(value) ? value : (value ? [value] : []);
      
      // Check matching inputs
      this.inputs.forEach(input => {
        input.checked = values.some(val => String(val) === String(input.value));
      });
    }
    
    input2value() {
      if (!this.inputs || !this.inputs.length) return [];
      
      // Collect checked values
      return this.inputs
        .filter(input => input.checked)
        .map(input => input.value);
    }
    
    value2html(value) {
      if (!value || !this.sourceData) return '';
      
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
    }
    
    str2value(str) {
      if (!str) return [];
      
      // Split by comma and trim
      return str
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length);
    }
    
    value2str(value) {
      if (!value) return '';
      
      // Join array values with comma
      return Array.isArray(value) ? value.join(',') : String(value);
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
    }
    
    str2value(str) {
      if (!str) return null;
      
      const date = new Date(str);
      return isNaN(date.getTime()) ? null : date;
    }
    
    value2input(value) {
      if (!this.input) return;
      
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
    }
    
    input2value() {
      return this.input.value ? new Date(this.input.value) : null;
    }
    
    autosubmit() {
      if (this.options.autosubmit) {
        this.input.addEventListener('change', () => {
          this.editable.form.submit();
        });
      }
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
    }
    
    str2value(str) {
      if (!str) return null;
      
      const date = new Date(str);
      return isNaN(date.getTime()) ? null : date;
    }
    
    value2input(value) {
      if (!this.input) return;
      
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
    }
    
    input2value() {
      return this.input.value ? new Date(this.input.value) : null;
    }
    
    autosubmit() {
      if (this.options.autosubmit) {
        this.input.addEventListener('change', () => {
          this.editable.form.submit();
        });
      }
    }
  }

  /**
   * HTML5 Input Types
   */

  // Password Input
  class PasswordInput extends TextInput {
    init() {
      super.init();
      this.input.type = 'password';
    }
    
    value2html() {
      return '******';
    }
  }

  // Email Input
  class EmailInput extends TextInput {
    init() {
      super.init();
      this.input.type = 'email';
    }
  }

  // URL Input
  class UrlInput extends TextInput {
    init() {
      super.init();
      this.input.type = 'url';
    }
  }

  // Tel Input
  class TelInput extends TextInput {
    init() {
      super.init();
      this.input.type = 'tel';
    }
  }

  // Number Input
  class NumberInput extends TextInput {
    init() {
      super.init();
      this.input.type = 'number';
      
      if (this.options.min !== undefined) {
        this.input.min = this.options.min;
      }
      
      if (this.options.max !== undefined) {
        this.input.max = this.options.max;
      }
      
      if (this.options.step !== undefined) {
        this.input.step = this.options.step;
      }
    }
    
    str2value(str) {
      return str === null || str === '' ? null : Number(str);
    }
  }

  // Range Input
  class RangeInput extends NumberInput {
    init() {
      super.init();
      this.input.type = 'range';
      
      // Create output to display the current value
      this.output = document.createElement('output');
      this.output.style.marginLeft = '10px';
      this.element.appendChild(this.output);
      
      this.input.addEventListener('input', () => {
        this.output.textContent = this.input.value;
      });
    }
    
    value2input(value) {
      super.value2input(value);
      this.output.textContent = this.input.value;
    }
  }

  /**
   * EditableForm class
   */
  class EditableForm {
    constructor(editable) {
      this.editable = editable;
      this.options = editable.options;
      this.input = editable.input;
    }
    
    render() {
      // Create form element
      this.element = document.createElement('form');
      this.element.className = 'editable-form';
      
      // Create input container
      const inputContainer = document.createElement('div');
      inputContainer.className = 'editable-input';
      
      // Render input
      this.input.render();
      
      // Append input to container
      inputContainer.appendChild(this.input.element);
      
      // Create buttons container
      const buttonsContainer = document.createElement('div');
      buttonsContainer.className = 'editable-buttons';
      
      // Create buttons if needed
      if (this.options.showbuttons) {
        // Submit button
        const submitButton = document.createElement('button');
        submitButton.type = 'submit';
        submitButton.className = 'btn btn-primary btn-sm editable-submit';
        submitButton.innerHTML = '<i class="bi bi-check"></i>';
        
        // Cancel button
        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'btn btn-secondary btn-sm editable-cancel';
        cancelButton.innerHTML = '<i class="bi bi-x"></i>';
        
        // Add buttons to container
        buttonsContainer.appendChild(submitButton);
        buttonsContainer.appendChild(cancelButton);
        
        // Add event listener for cancel button
        cancelButton.addEventListener('click', (e) => {
          e.preventDefault();
          this.editable.hide();
          this.editable.triggerEvent('cancel');
        });
      }
      
      // Create error container
      this.errorContainer = document.createElement('div');
      this.errorContainer.className = 'editable-error-block invalid-feedback';
      this.errorContainer.style.display = 'none';
      
      // Append all elements to form
      this.element.appendChild(inputContainer);
      this.element.appendChild(buttonsContainer);
      this.element.appendChild(this.errorContainer);
      
      // Add form to container
      this.editable.container.setContent(this.element);
      
      // Add form submit handler
      this.element.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submit();
      });
      
      // Set up autosubmit if no buttons are shown
      if (!this.options.showbuttons) {
        this.input.autosubmit();
      }
      
      // Set initial value
      const value = this.editable.options.value !== null 
        ? this.editable.options.value 
        : this.editable.options.defaultValue;
      
      this.input.value2input(value);
      
      // Activate input (focus)
      setTimeout(() => {
        this.input.activate();
      }, 0);
    }
    
    submit() {
      // Get value from input
      const newValue = this.input.input2value();
      
      // Validate value
      const error = this.editable.validate(newValue);
      
      if (error) {
        this.error(error);
        return;
      }
      
      // Clear any errors
      this.error(false);
      
      // Save value
      this.editable.save(newValue);
    }
    
    error(msg) {
      if (msg === false) {
        this.errorContainer.style.display = 'none';
        this.errorContainer.textContent = '';
        this.element.classList.remove('is-invalid');
      } else {
        this.errorContainer.style.display = 'block';
        this.errorContainer.textContent = msg;
        this.element.classList.add('is-invalid');
      }
    }
  }

  /**
   * Container base class
   */
  class AbstractContainer {
    constructor(editable) {
      this.editable = editable;
      this.options = editable.options;
      this.init();
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
      // To be implemented by child classes
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
      // Create popover container
      this.element = document.createElement('div');
      this.element.className = 'editable-container editable-popup';
      this.element.style.position = 'absolute';
      this.element.style.display = 'none';
      this.element.style.zIndex = '1060';
      
      // Create popover arrow
      this.arrow = document.createElement('div');
      this.arrow.className = 'popover-arrow';
      
      // Create popover body
      this.body = document.createElement('div');
      this.body.className = 'popover-body';
      
      // Create loading indicator
      this.loading = document.createElement('div');
      this.loading.className = 'editable-loading';
      this.loading.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"><span class="visually-hidden">Loading...</span></div>';
      this.loading.style.display = 'none';
      
      // Append elements
      this.element.appendChild(this.arrow);
      this.element.appendChild(this.body);
      this.element.appendChild(this.loading);
      
      // Add container to document
      document.body.appendChild(this.element);
      
      // Add global click handler to close popover when clicking outside
      document.addEventListener('mousedown', (e) => {
        if (this.element.style.display === 'block' && 
            !this.element.contains(e.target) && 
            e.target !== this.editable.element && 
            !this.editable.element.contains(e.target)) {
          
          // Handle onblur option
          if (this.options.onblur === 'submit') {
            this.editable.form && this.editable.form.submit();
          } else if (this.options.onblur === 'cancel') {
            this.hide();
            this.editable.triggerEvent('cancel');
          }
          // If onblur is 'ignore', do nothing
        }
      });
      
      // Add escape key handler
      document.addEventListener('keyup', (e) => {
        if (e.key === 'Escape' && this.element.style.display === 'block') {
          this.hide();
          this.editable.triggerEvent('cancel');
        }
      });
    }
    
    show() {
      // Show container
      this.element.style.display = 'block';
      
      // Set position
      this.setPosition();
      
      // Add show classes for animation
      this.element.classList.add('bs-popover-auto', 'show');
    }
    
    hide() {
      this.element.style.display = 'none';
      this.element.classList.remove('show');
    }
    
    setContent(content) {
      // Clear previous content
      this.body.innerHTML = '';
      
      // If content is a DOM element, append it
      if (content instanceof Element) {
        this.body.appendChild(content);
      } else {
        // Otherwise set as HTML
        this.body.innerHTML = content;
      }
      
      // Update position as content might change size
      if (this.element.style.display === 'block') {
        this.setPosition();
      }
    }
    
    showLoading() {
      this.loading.style.display = 'block';
      if (this.body) {
        this.body.style.visibility = 'hidden';
      }
    }
    
    hideLoading() {
      this.loading.style.display = 'none';
      if (this.body) {
        this.body.style.visibility = 'visible';
      }
    }
    
      setPosition() {
      const elementRect = this.editable.element.getBoundingClientRect();
      const containerRect = this.element.getBoundingClientRect();
      
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      const placement = this.options.placement || 'top';
      
      // Calculate position based on placement
      let top, left;
      
      // Default is top placement
      switch (placement) {
        case 'top':
          top = elementRect.top - containerRect.height - 10;
          left = elementRect.left + (elementRect.width / 2) - (containerRect.width / 2);
          this.arrow.style.top = '100%';
          this.arrow.style.left = '50%';
          this.arrow.style.transform = 'translateX(-50%)';
          break;
          
        case 'bottom':
          top = elementRect.bottom + 10;
          left = elementRect.left + (elementRect.width / 2) - (containerRect.width / 2);
          this.arrow.style.top = '-10px';
          this.arrow.style.left = '50%';
          this.arrow.style.transform = 'translateX(-50%)';
          break;
          
        case 'left':
          top = elementRect.top + (elementRect.height / 2) - (containerRect.height / 2);
          left = elementRect.left - containerRect.width - 10;
          this.arrow.style.top = '50%';
          this.arrow.style.left = '100%';
          this.arrow.style.transform = 'translateY(-50%)';
          break;
          
        case 'right':
          top = elementRect.top + (elementRect.height / 2) - (containerRect.height / 2);
          left = elementRect.right + 10;
          this.arrow.style.top = '50%';
          this.arrow.style.left = '-10px';
          this.arrow.style.transform = 'translateY(-50%)';
          break;
      }
      
      // Adjust for scrolling
      top += scrollTop;
      left += scrollLeft;
      
      // Check for overflow and adjust if needed
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // Adjust vertical position if overflowing
      if (top < scrollTop) {
        top = elementRect.bottom + scrollTop + 10;
        this.arrow.style.top = '-10px';
        this.arrow.style.left = '50%';
        this.arrow.style.transform = 'translateX(-50%)';
      } else if (top + containerRect.height > scrollTop + viewportHeight) {
        top = elementRect.top + scrollTop - containerRect.height - 10;
        this.arrow.style.top = '100%';
        this.arrow.style.left = '50%';
        this.arrow.style.transform = 'translateX(-50%)';
      }
      
      // Adjust horizontal position if overflowing
      if (left < scrollLeft) {
        left = scrollLeft + 10;
        this.arrow.style.left = `${elementRect.left + (elementRect.width / 2) - left}px`;
      } else if (left + containerRect.width > scrollLeft + viewportWidth) {
        left = scrollLeft + viewportWidth - containerRect.width - 10;
        this.arrow.style.left = `${elementRect.left + (elementRect.width / 2) - left}px`;
      }
      
      // Apply position
      this.element.style.top = `${top}px`;
      this.element.style.left = `${left}px`;
    }
  }

  /**
   * Inline Container (for inline mode)
   */
  class InlineContainer extends AbstractContainer {
    init() {
      // Create inline container
      this.element = document.createElement('div');
      this.element.className = 'editable-container editable-inline';
      
      // Create loading indicator
      this.loading = document.createElement('div');
      this.loading.className = 'editable-loading';
      this.loading.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"><span class="visually-hidden">Loading...</span></div>';
      this.loading.style.display = 'none';
      
      // Insert container after the editable element
      this.editable.element.parentNode.insertBefore(this.element, this.editable.element.nextSibling);
    }
    
    show() {
      // Hide the editable element
      this.editable.element.style.display = 'none';
      
      // Show container
      this.element.style.display = 'block';
    }
    
    hide() {
      // Show the editable element
      this.editable.element.style.display = '';
      
      // Hide container
      this.element.style.display = 'none';
    }
    
    setContent(content) {
      // Clear previous content
      this.element.innerHTML = '';
      
      // If content is a DOM element, append it
      if (content instanceof Element) {
        this.element.appendChild(content);
      } else {
        // Otherwise set as HTML
        this.element.innerHTML = content;
      }
      
      // Append loading indicator
      this.element.appendChild(this.loading);
    }
    
    showLoading() {
      // Show loading indicator
      this.loading.style.display = 'block';
      
      // Hide form
      const form = this.element.querySelector('.editable-form');
      if (form) {
        form.style.visibility = 'hidden';
      }
    }
    
    hideLoading() {
      // Hide loading indicator
      this.loading.style.display = 'none';
      
      // Show form
      const form = this.element.querySelector('.editable-form');
      if (form) {
        form.style.visibility = 'visible';
      }
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
    }
  };

  /**
   * Public API
   */
  
  // Initialize editable on an element
  function editable(selector, options = {}) {
    let elements;
    
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
      if (element.editable) {
        element.editable.destroy();
      }
      
      // Create new editable instance
      const instance = new Editable(element, options);
      
      // Store instance on element
      element.editable = instance;
      
      instances.push(instance);
    });
    
    return instances.length === 1 ? instances[0] : instances;
  }
  
  // Add destroy method to Editable prototype
  Editable.prototype.destroy = function() {
    // Remove event listeners
    if (this.options.toggle !== 'manual') {
      this.element.removeEventListener(this.options.toggle, this.element._editableToggleHandler);
    }
    
    // Remove container
    if (this.container) {
      if (this.container.element) {
        if (this.container.element.parentNode) {
          this.container.element.parentNode.removeChild(this.container.element);
        }
      }
    }
    
    // Remove classes
    this.element.classList.remove('editable', 'editable-click', 'editable-open', 'editable-disabled');
    
    // Remove reference to editable instance
    delete this.element.editable;
  };
  
  // Expose to global scope
  window.Editable = Editable;
  window.editable = editable;
  
  // Auto-initialize editables with data-editable attribute
  document.addEventListener('DOMContentLoaded', () => {
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
      editable(element, options);
    });
  });
})();
