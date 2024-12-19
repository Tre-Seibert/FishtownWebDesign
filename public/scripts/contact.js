document.querySelector('#cs-form-1105').addEventListener('submit', async (event) => {
    event.preventDefault(); // Prevent the form's default behavior

    // Extract form data
    const formData = {
        name: document.querySelector('#name-1105').value,
        email: document.querySelector('#email-1105').value,
        phone: document.querySelector('#phone-1105').value,
        message: document.querySelector('#message-1105').value,
    };

    try {
        // Send form data to the server
        const response = await fetch('/submit-appointment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        });

        // Process server response
        const result = await response.text();

        // Show the modal with the response
        document.querySelector('#modal-message').textContent = result || 'Your message has been sent. Please allow 1 business day for a response.';
        document.querySelector('#responseModal').style.display = 'block';

        // Optionally, clear the form
        document.querySelector('#cs-form-1105').reset();
    } catch (error) {
        console.error('Error submitting the form:', error);
        document.querySelector('#modal-message').textContent = 'There was an error submitting the form. Please try again.';
        document.querySelector('#responseModal').style.display = 'block';
    }
});

// Close the modal when the "Close" button is clicked
document.querySelector('#closeModal').addEventListener('click', () => {
    document.querySelector('#responseModal').style.display = 'none';
});
