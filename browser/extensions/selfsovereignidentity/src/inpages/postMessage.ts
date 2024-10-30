import { PromiseQueue } from "./promiseQueue"
// global queue object
const queue = new PromiseQueue()

export function postMessage<T>(
  scope: string,
  action: string,
  args: T | undefined
): Promise<T> {
  return queue.add(
    () =>
      new Promise((resolve, reject) => {
        const id = Math.random().toString().slice(4)

        // Post the request to the content script
        window.postMessage(
          {
            id,
            application: "ssb",
            action: `${scope}/${action}`,
            scope,
            args,
          },
          window.location.origin
        )

        function handleWindowMessage(messageEvent: MessageEvent) {
          // check if it is a relevant message
          // there are some other events happening
          if (
            messageEvent.origin !== window.location.origin ||
            !messageEvent.data ||
            !messageEvent.data.response ||
            messageEvent.data.application !== "ssb" ||
            messageEvent.data.scope !== scope ||
            messageEvent.data.id !== id
          ) {
            return
          }

          console.info("debug", messageEvent.data)

          if (messageEvent.data.data.error) {
            reject(new Error(messageEvent.data.data.error))
          } else {
            // 1. data: the message data
            // 2. data: the data passed as data to the message
            // 3. data: the actual response data
            resolve(messageEvent.data.data.data)
          }

          // For some reason must happen only at the end of this function
          window.removeEventListener("message", handleWindowMessage)
        }

        // The message listener to listen to content calls
        // After, return the response to the web apps
        window.addEventListener("message", handleWindowMessage)
      })
  )
}
