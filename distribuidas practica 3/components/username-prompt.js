export class UsernamePrompt extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.render();
    }

    connectedCallback() {
        this.shadowRoot.querySelector('form').addEventListener('submit', (e) => {
            e.preventDefault();
            const username = this.shadowRoot.querySelector('#username-input').value.trim();
            const room = this.shadowRoot.querySelector('#room-input').value.trim();
            
            if (username && room) {
                this.dispatchEvent(new CustomEvent('join-room', {
                    detail: { username, room },
                    bubbles: true,
                    composed: true
                }));
            }
        });
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 15px;
                    width: 100%;
                }
                h3 { margin: 0; color: #333; text-align: center; }
                form { display: flex; flex-direction: column; gap: 10px; width: 280px; }
                input { padding: 10px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px; }
                button {
                    padding: 10px; background-color: #4a6fa5; color: white; border: none;
                    border-radius: 6px; cursor: pointer; font-weight: bold;
                    transition: background 0.2s;
                }
                button:hover { background-color: #334e7a; }
            </style>
            <h3>Ingresa los datos para la sala</h3>
            <form>
                <input type="text" id="username-input" placeholder="Tu nombre..." required autocomplete="off" />
                <input type="text" id="room-input" placeholder="Nombre de la sala..." required autocomplete="off" />
                <button type="submit">Entrar a la Sala</button>
            </form>
        `;
    }
}
customElements.define('username-prompt', UsernamePrompt);