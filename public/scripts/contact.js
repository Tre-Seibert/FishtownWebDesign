// Handle form submission with Web3Forms
document.querySelector('#cs-form-1105').addEventListener('submit', async (event) => {
    // Don't prevent default - let Web3Forms handle the submission
    // The form will submit to Web3Forms and redirect back to our site
    
    // Show loading state
    const submitButton = event.target.querySelector('.cs-submit');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Sending...';
    submitButton.disabled = true;
    
    // The form will naturally submit to Web3Forms
    // Web3Forms will redirect back to our site with #success hash
    // Our main script will detect this and show the modal
});

// Close the modal when the "Close" button is clicked
document.querySelector('#closeModal').addEventListener('click', () => {
    document.querySelector('#responseModal').style.display = 'none';
});

// Close modal when clicking outside of it
window.addEventListener('click', (event) => {
    const modal = document.querySelector('#responseModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});
