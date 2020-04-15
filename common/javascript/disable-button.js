var continueBtn = document.getElementsByClassName('continueBtn');
var radio = document.getElementsByName('sign-off');

function changeHandler() {
  if (this.value === 'yes' ) {
    continueBtn[0].classList.remove('govuk-button--disabled')
  } else {
    continueBtn[0].classList.add('govuk-button--disabled')
  }
}

// When the user clicks back, button should not be disabled - to fix

Array.prototype.forEach.call(radio, function(radio) {
  radio.addEventListener('change', changeHandler);
});
