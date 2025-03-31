import App from "./App.svelte";
if (!customElements.get("svelte-dashboard")) {
	customElements.define("svelte-dashboard", class extends HTMLElement {
	  constructor() {
		super();
		new App({ target: this.attachShadow({ mode: "open" }) });
	  }
	});
  }
  