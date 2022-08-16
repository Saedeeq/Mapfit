'use strict';





class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);
    clicks = 0;

    constructor(coords, distance, duration) {
        // this.date = ...
        // this.id = ...
        this.coords = coords; // [lat, lng]
        this.distance = distance; // inkm
        this.duration = duration; // min
        
    }

    _setDescription() {
        // prettier-ignore
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
        'September', 'October', 'Novmber', 'December'];

        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]
        } ${this.date.getDate()}`;
    }

    click() {
        this.clicks++;
    }
}

class Running extends Workout {
    type = 'running';

    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace() {
        // min/km
        this.pace = this.duration / this.distance;
        return this.pace
    }
}

class Cycling extends Workout {
    type = 'cycling';

    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        // this.type = 'cycling';
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed() {
        // km/h
        this.speed = this.distance / (this.duration / 60); 
        return this.speed
    }

}

// const run1 = new Running([39, -12], 5.2, 24, 178)
// const cyc1 = new Cycling([39, -12], 27, 95, 523)
// console.log(run1, cyc1);


//////////////////////////////////////////////////////////
// APPLICATION ARCHITECTURE 

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const resetButton = document.querySelector('.reset__row');
const deleteButton = document.querySelector('.deleteBtn');




class App {
    #map;
    #mapZoomLevel = 13;
    #mapEvent;
    #workouts = [];

    constructor() {
        // Get user's position
        this._getPosition();

        // Get data from local storage
        this._getLocalStorage();

        // Attach event handlers
        form.addEventListener('submit', this._newWorkout.bind(this));
        inputType.addEventListener('change', this._toggleElevationField);
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
        resetButton.addEventListener('click', this.reset.bind(this));

    }

    _getPosition() {
        if(navigator.geolocation)
        navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function() {
        alert('Could not get your position')
       });
    }

    _loadMap(position) {
            const{latitude} = position.coords;
            const{longitude} = position.coords;
        console.log(`https://www.google.com/maps/@${latitude},${longitude},15.67z`);
        
        const coords = [latitude, longitude]
        
        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
        // console.log(map);
     
        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);
    
            // Handling clicks on map
            this.#map.on('click', this._showForm.bind(this));

            this.#workouts.forEach(work => {
                this._renderWorkoutMarker(work);
            });

            
    }

    _showForm(mapE) {
        this.#mapEvent = mapE;
                form.classList.remove('hidden');
                inputDistance.focus();
                // button.classList.remove('hidden');
    }

    _hideForm() {
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';

        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => (form.style.display = 'grid'), 1000);
        // button.classList.add('hidden');
    }

    _toggleElevationField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    } 

    _newWorkout(e) {
        const validInputs = (...inputs) =>
        inputs.every(inp => Number.isFinite(inp));
        const allPositive = (...inputs) => inputs.every(inp => inp > 0);


        e.preventDefault();

        // Get data from form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const {lat, lng} = this.#mapEvent.latlng;
        let workout;
       

        // If workout running, create runnng object
        if(type === 'running') {
            const cadence = +inputCadence.value;
            // Check if data is valid
            if(
                // !Number.isFinite(distance) ||
                // !Number.isFinite(duration) ||
                // !Number.isFinite(cadence)
                !validInputs(distance, duration, cadence) || 
                !allPositive(distance, duration, cadence)
              ) 
            return alert('Inputs have to be positive numbers!')

            workout = new Running([lat, lng], distance, duration, cadence);
            
        }

        // If workout cycling, create cycling object
        if(type === 'cycling') {
            const elevation = +inputElevation.value;

            if(!validInputs(distance, duration, elevation) || 
            !allPositive(distance, duration)) 
            return alert('Inputs have to be positive numbers!')

            workout = new Cycling([lat, lng], distance, duration, elevation);
        }
    

        // Add new object to workout array
        this.#workouts.push(workout);

        //Render workout on map as marker
        this._renderWorkoutMarker(workout);
        
        // Render workout on list
        this._renderWorkout(workout);

        // Set local storage to all workouts
        this._setLocalStorage();
        
        // Hide the form + clear input fields
        this._hideForm();
        
        

        
    }  
    
    _renderWorkoutMarker(workout) {
        L.marker(workout.coords)
        .addTo(this.#map)
        .bindPopup(
            L.popup({
            maxWidth: 250,
            minWidth: 100,
            autoClose: false,
            closeOnClick: false,
            className: `${workout.type}-popup`,
        })
        )
        .setPopupContent(`${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
        } ${workout.description}`)
        .openPopup();
    }

    _renderWorkout(workout, index) {
        window.deleteAction = () => this.deleteWorkout(index)
        let html = `
        <button class="deleteBtn" onclick="deleteAction()">❌</button>
        <button class="editBtn">⛔</button>
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
            <h2 class="workout__title">${workout.description}</h2>
            <div class="workout__details">
                <span class="workout__icon">${
                    workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
                }</span>
                <span class="workout__value">${workout.distance}</span>
                <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⏱</span>
                <span class="workout__value">${workout.duration}</span>
                <span class="workout__unit">min</span>
            </div>
        `;

        // const deleteBtn = document.createElement('button');
        // deleteBtn.innerHTML = "Delete";
        // deleteBtn.setAttribute('class', 'actionBtn deleteBtn');
        // deleteBtn.onclick = () => deleteTodoItem(workout)


        if(workout.type === 'running')
            html += `
            <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.pace.toFixed(1)}</span>
                <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">🦶🏼</span>
                <span class="workout__value">${workout.cadence}</span>
                <span class="workout__unit">spm</span>
                </div>
            </li>
        `;

        if(workout.type === 'cycling')
            html += `
            <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.speed.toFixed(1)}</span>
                <span class="workout__unit">km/h</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">🏔️</span>
                <span class="workout__value">${workout.elevationGain}</span>
                <span class="workout__unit">m</span>
            </div>
        </li>
        `;

        form.insertAdjacentHTML('afterend', html);
        
    } 

    deleteWorkout(index) {
        console.log('i am here', index)
        this.#workouts.splice(index, 1)
        this._setLocalStorage()
        this._renderWorkout()
        this._getLocalStorage()
    }


    editWorkout(workout) {

    }

    _moveToPopup(e) {
        const workoutEl = e.target.closest('.workout');

        if (!workoutEl) return;

        const workout = this.#workouts.find(
            work => work.id === workoutEl.dataset.id
        );

        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1,
            },
        });

        // using the public interface
        // workout.click();
    }

    _setLocalStorage() {
        console.log('something huge')
       localStorage.setItem('workouts', JSON.stringify(this.#workouts));  
    }

    _getLocalStorage() {
       const data = JSON.parse(localStorage.getItem('workouts'));

       if (!data) return;

       this.#workouts = data;

       this.#workouts.forEach((work, index ) => {
        this._renderWorkout(work, index);
       });
    }

    reset() {
        localStorage.removeItem('workouts');
        location.reload();  
      }

    
}
const app = new App();



// inputType.addEventListener('change', function () {
//     inputElevation.closest('.form__input--type').classList.toggle('running-popup');
//     inputCadence.closest('.form__input--type').classList.toggle('cycling-popup');
// });
