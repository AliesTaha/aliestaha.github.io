'use strict';

/////////////////////////////////////////////////
/////////////////////////////////////////////////
// BANKIST APP

// Data
const account1 = {
  owner: 'Jonas Schmedtmann',
  movements: [200, 450, -400, 3000, -650, -130, 70, 1300],
  interestRate: 1.2, // %
  pin: 1111,
};

const account2 = {
  owner: 'Jessica Davis',
  movements: [5000, 3400, -150, -790, -3210, -1000, 8500, -30],
  interestRate: 1.5,
  pin: 2222,
};

const account3 = {
  owner: 'Steven Thomas Williams',
  movements: [200, -200, 340, -300, -20, 50, 400, -460],
  interestRate: 0.7,
  pin: 3333,
};

const account4 = {
  owner: 'Sarah Smith',
  movements: [430, 1000, 700, 50, 90],
  interestRate: 1,
  pin: 4444,
};

const accounts = [account1, account2, account3, account4];

// Elements
const labelWelcome = document.querySelector('.welcome');
const labelDate = document.querySelector('.date');
const labelBalance = document.querySelector('.balance__value');
const labelSumIn = document.querySelector('.summary__value--in');
const labelSumOut = document.querySelector('.summary__value--out');
const labelSumInterest = document.querySelector('.summary__value--interest');
const labelTimer = document.querySelector('.timer');

const containerApp = document.querySelector('.app');
const containerMovements = document.querySelector('.movements');

const btnLogin = document.querySelector('.login__btn');
const btnTransfer = document.querySelector('.form__btn--transfer');
const btnLoan = document.querySelector('.form__btn--loan');
const btnClose = document.querySelector('.form__btn--close');
const btnSort = document.querySelector('.btn--sort');

const inputLoginUsername = document.querySelector('.login__input--user');
const inputLoginPin = document.querySelector('.login__input--pin');
const inputTransferTo = document.querySelector('.form__input--to');
const inputTransferAmount = document.querySelector('.form__input--amount');
const inputLoanAmount = document.querySelector('.form__input--loan-amount');
const inputCloseUsername = document.querySelector('.form__input--user');
const inputClosePin = document.querySelector('.form__input--pin');

const displayMovements = function (movements){
  document.querySelector('.movements').innerHTML='';
  movements.forEach(function (mov, i){
    const type = (mov>0)? 'deposit' : 'withdrawal';
    const html=`
    <div class="movements__row">
    <div class="movements__type movements__type--${type}">${i+1} ${type}</div>
    <div class="movements__value">${mov}€</div>
    `;

    containerMovements.insertAdjacentHTML('afterbegin', html);
  });
};

displayMovements(account1.movements);
/////////////////////////////////////////////////
/////////////////////////////////////////////////
// LECTURES


const movements = [200, 450, -400, 3000, -650, -130, 70, 1300];

for (const [i, movement] of movements.entries()){
  if (movement>0){
    console.log(`Movement ${i+1} You deposited ${movement}`);
  }
  else{
    console.log(`Movement You withdrew ${movement}`);
  }
}

movements.forEach(function(mov, i, arr){
  if (mov>0){
    console.log(`Movement ${i+1} You deposited ${mov}`);
  }
  else{
    console.log(`Movement ${i+1} You withdrew ${Math.abs(mov)}`);
  }
})


/////////////////////////////////////////////////
let arr = ['a', 'b', 'c', 'd', 'e'];

//Slice 
console.log(arr.slice(2));
console.log(arr.slice(2,4));
console.log(arr.slice(-2));

//Splice
console.log(arr.splice(2));

const arr1 = [23, 11, 64];
console.log(arr[0]);
console.log(arr.at(0 ));

const currencies = new Map([
  ['USD', 'United States dollar'],
  ['EUR', 'Euro'],
  ['GBP', 'Pound sterling'],
]);

//i mov in for(const [i,mov] of movements.entries())
//mov i arr in forEach() in arrays
currencies.forEach(function(value, key, map){
  console.log(`${key}: ${value}`);
});

const apiKey = '9a7dea0e2aa946c48e769034c5321b30';
const apiUrl = 'https://openexchangerates.org/api';
const baseCurrency = 'USD';
const targetCurrency = 'EUR';

let USDto = null;
let toUSD = null;

fetch(`${apiUrl}/latest.json?app_id=${apiKey}&base=${baseCurrency}`)
  .then(response => response.json())
  .then(data => {
    USDto = data.rates[targetCurrency];
    toUSD = 1 / USDto;

    //Continue after having fetched everything
    //----------------------------------------
    makingArrays();
    createUsernames(accounts);
    const withdrawals= filtering(movements);
    const balance= accBalance(account1);
    calcDisplaySummary(account1.movements);
    const totalDepositUSD= movements.filter(mov=> mov>0).map(mov=>toUSD*mov).reduce((acc, mov)=> acc+mov, 0);
    console.log(totalDepositUSD);
    //-----------------------------------------
  })
  .catch(error => {
    console.log('Error:', error);
  });

  function makingArrays(){
      makeArraysNum();
      const movementsDescription=makeArraysDesc();
      console.log(movementsDescription);
      function makeArraysNum(){
      const movementsUSD= movements.map(mov=> {
        return mov*toUSD;
      })
      //const movementsUSD = movements.map(mov => mov * toUSD);
      const movementsUSD2=[];
      for(const mov of movements){
        movementsUSD2.push(mov*toUSD)
      }
      console.log(movementsUSD);
      console.log(movementsUSD2);
    }
    function makeArraysDesc(){

      //.map(), .forEach(), .for
      const movementDescriptions=movements.map((mov, i , arr)=>{
        `Movement ${i+1}: You ${mov>0 ? 'deposited' : 'withdres'} ${Math.abs(mov)}`;
      })

      const movementsDescription= movements.map((mov, i, arr)=>{
        if (mov>0){
          return `Movement ${i+1}: You deposited ${Math.abs(mov)}`
        }
        else{
          return `Movement ${i+1}: You withdrew ${Math.abs(mov)}`
        }
      })
      return movementsDescription;
    }

      //----------------------------------------
  }

  function createUsernames(accs){
    accs.forEach(function(acc){
        const usernameWords= acc.owner.toLowerCase().split(" ");
        const usernameLetters= usernameWords.map((mov, i, arr)=>{
          return mov[0]
        });
        const username=usernameLetters.join('');
        acc.username=username;
    })
  }

  function filtering(movements){
    const withdrawals= movements.filter((mov, i, arr)=>{
      return mov<0;
    });
    return withdrawals;
  }

  function accBalance(acc){
     acc.balance= acc.movements.reduce((acc, mov, i , arr)=>
      acc+mov, 0);
    document.querySelector('.balance__value').textContent=`${acc.balance}€`;
  }

  function calcDisplaySummary(acc){
    const incomes=acc.movements.filter(mov=>mov>0).reduce((acc,mov,i,arr)=>acc+mov,0);
    labelSumIn.textContent=`${incomes}€`;

    const out= acc.movements.filter(mov=>mov<0).reduce(function (acc,mov){return acc+mov}, 0);
    labelSumOut.textContent=`${Math.abs(out)}€`;

    const interest= acc.movements.filter(mov=>mov>0).map(deposit=>deposit*acc.interestRate/100).reduce((acc, int, i, arr)=>acc+int,0);
    console.log(interest);
    labelSumInterest.textContent=`${Math.round(interest*10)/10}€`
  }

  function updateUI(currentAccount){
    //Display movements
    displayMovements(currentAccount.movements);
    //Display summary
    calcDisplaySummary(currentAccount);
    //Display balance
    accBalance(currentAccount);
  }
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Event Handlers
let currentAccount;
  btnLogin.addEventListener('click', function(e){
    e.preventDefault();
    //This prevents form from submitting
    console.log('Login');

    currentAccount=accounts.find(
      acc=> acc.username===inputLoginUsername.value
      );
    console.log(currentAccount);

    if(currentAccount?.pin===Number(inputLoginPin.value)){
      labelWelcome.textContent=`Welcome back, ${currentAccount.owner.split(' ')[0]}`;
      containerApp.style.opacity=100;

      //clear input fields
      inputLoginUsername.value= inputLoginPin.value='';
      inputLoginPin.blur();

      updateUI(currentAccount);
    }
  })

//  document.querySelector().addEventListener('',)
//  .textContent()

btnTransfer.addEventListener('click', (e)=>{
  e.preventDefault();
  const amount = Number(inputTransferAmount.value);
  const recAcc= accounts.find(acc=> acc.username===inputTransferTo.value);
  inputTransferAmount.value=inputTransferTo.value='';

  if(amount>0 && currentAccount.balance>=amount && recAcc && recAcc?.username!==currentAccount.username){
    currentAccount.movements.push(-amount);
    recAcc.movements.push(amount);
    updateUI(currentAccount);
  }

});

btnLoan.addEventListener('click',(e)=>{
  e.preventDefault();
  const amount= Number(inputLoanAmount.value);
  if (amount>0 && currentAccount.movements.some(mov=> mov>= amount*0.1)){
    // Add movement
    currentAccount.movements.push(amount);

    //Update UI 
    updateUI(currentAccount);
  }
  inputLoanAmount.value='';
})

btnClose.addEventListener('click', (e)=>{
  e.preventDefault();
  if(Number(inputClosePin.value)===currentAccount.pin && inputCloseUsername.value===currentAccount.username){
    const index= accounts.findIndex(
      acc=>acc.username===currentAccount.username);
    console.log(index);
    accounts.splice(index, 1);
    //Hide UI
    containerApp.style.opacity=0;
  }
  inputCloseUsername.value=inputClosePin.value='';

});