/**
 * Arduino sketches shown in steps. Ported verbatim from the prototype
 * (jumper.html:509-528); the comments are part of the teaching, so they stay.
 */

export const blink = `const int LED_PIN = 9;

void setup() {
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_PIN, HIGH);  // LED on
  delay(1000);                  // wait 1 second
  digitalWrite(LED_PIN, LOW);   // LED off
  delay(1000);                  // wait 1 second
}`;

export const blinkFast = `void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(200);   // was 1000
  digitalWrite(LED_BUILTIN, LOW);
  delay(200);   // was 1000
}`;
