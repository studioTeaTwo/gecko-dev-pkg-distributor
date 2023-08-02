/**
 * Actor child class for the about:tor page.
 */
export class AboutTorChild extends JSWindowActorChild {
  handleEvent(event) {
    switch (event.type) {
      case "DOMContentLoaded":
        this.sendQuery("AboutTor:GetInitialData").then(data => {
          const initialDataEvent = new this.contentWindow.CustomEvent(
            "InitialData",
            { detail: Cu.cloneInto(data, this.contentWindow) }
          );
          this.contentWindow.dispatchEvent(initialDataEvent);
        });
        break;
      case "SubmitSearchOnionize":
        this.sendAsyncMessage("AboutTor:SetSearchOnionize", !!event.detail);
        break;
      case "L10nMutationsFinished":
        // Pass on chrome-only event for completed localization to content.
        this.contentWindow.dispatchEvent(
          new this.contentWindow.CustomEvent("L10nMutationsFinished")
        );
        break;
    }
  }
}
