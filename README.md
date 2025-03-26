editable('#u_intro', {
    type: 'textarea',
    pk: 1,
    url: '/assets/php/ajax/edit.php',
    title: 'Enter your biography',
    mode: 'popup',
    showbuttons: false,
    rows: 3,
    placeholder: 'Write something about yourself',
    onblur: 'submit'
});
