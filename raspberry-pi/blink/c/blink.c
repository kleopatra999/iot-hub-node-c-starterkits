#include <stdio.h>
#include <stdbool.h>
#include <wiringPi.h>
#include <wiringPiSPI.h>

const int RED_LED_PIN = 7;

int main(int argc, char *argv[])
{
    wiringPiSetup();
    bool on = 1;
    for (;;)
    {
        printf("Switching %s the LED...\n", on ? "on" : "off");
        digitalWrite(RED_LED_PIN, on ? HIGH : LOW);
        on = !on;
        sleep(1);
    }
}
