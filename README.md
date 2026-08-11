# RIT Duty Pick Tool

A streamlined, visual scheduling tool to make Resident Advisor (RA) duty selection clear, fast, and administratable by a *single RC*.

## Running the Duty Draft

These instructions are for the Resident Coordinator (RC) facilitating a live duty draft. The calendar link should be pre-configured by the Training Committee; ensure you are using the correct link before beginning. As RAs state their preferred dates, use the interface below to log their selections.

### 1. Import the Roster

* Click the **Import** button in the top left.
* Upload a CSV file containing the RA staff. *Note: The application respects the exact order of the CSV file. It does not randomize.*
* **Warning:** Importing a new CSV will overwrite the current roster and clear all selected duties.

### Make sure you have imported the .csv file with the residents for the CORRECT duty line.

### 2. Managing the Draft Queue

The top banner displays the RA currently picking and the RA up next. The active picker's name is highlighted in green.

* The active RA's previously selected duties will highlight in gold/yellow to display their current distribution across the calendar.
* The draft order automatically advances down the roster list after each selection.

### 3. Inputting Duty Selections (Two Methods)

When an RA states their requested month and day, you can input the selection using your mouse or keyboard. 

**Method A: Point and Click**

* Locate the requested date on the calendar.
* Click an available (grey) triangle in the date square.
* *Note:* Triangles colored green or purple are already assigned (hover over the triangle to view the assigned RA). Crossed-out days are unavailable for selection.

**Method B: Fast Pick (Keyboard Shortcut)**

* Without clicking into a text box, type the first letter of the month and the date.
* *Example:* For October 24th, type `o24`. For August 5th, type `au5`. (April uses `p`).
* Press `Enter` or `Spacebar` to lock the selection. The system will automatically assign the first available slot on that day to the active RA.

### 4. Providing Calendar Sync Options to RAs

RAs can immediately add their selected duties to their mobile calendars.

* **Bottom QRs:** If enabled, the most recent assignments appear at the bottom of the screen. RAs can scan these directly with their phone cameras to create a calendar event in their phone.
* **Top Text QR:** AFTER DUTY PICK IS FINISHED, you can go through the list of RAs, and RAs can scan the top right QR code to generate a pre-filled text message containing a list of all their (the current selected RA) duty dates which they can send to themselves.

### 5. Swaps (AFTER DUTY PICK IS FINISHED)

1. **Press Swap** to enter into swap mode.
2. In the **Roster Pane** click the checkmark for the duty of one of the RAs who is swapping.
3. In the **Calendar Pane** click the triangle that corresponds to the duty of the other RA. 
4. **Double check the info** in the 'are you sure' popup; make sure it is the right RA's being swapped, and the right dates.

---

## Interface Guide

### The Roster Pane (Left Side)

* **Dark Mode (Moon/Sun Icon):** Toggles the application between a light and dark theme.
* **3-Dot Menu (Display Options):**
* **Names Only:** Hides the duty checkmarks and enlarges the RA names for better visibility when projecting to a screen.
* **Show Bottom QRs:** Toggles the row of large QR codes at the bottom of the screen for recent picks.
* **Top Text QR:** Displays a QR code in the top right that drafts a text message with the currently selected RA's full schedule.


* **Wraparound / Snake Dropdown:** Determines the draft order. *Wraparound* proceeds 1-10, then 1-10 again. *Snake* proceeds 1-10, then 10-1. 
* **Swap:** Enters Swap Mode. Click a checkmark next to an RA's name, then click a new date on the calendar to move their shift.
* **Weekends / Weekdays Toggle:** Flips the calendar and roster to focus on the selected duty type.
* **Start/Pause Pick:** Unlocks or locks the calendar interface.

### The Calendar Pane (Right Side)

* **Settings:** ONLY FOR TRAINING COMMITTEE TO CHANGE
* **Shortcut:** The current [m]onth day [#] keyboard being input.
* **Undo Last:** Reverts the previous duty selection and returns the turn to the previous RA.
* **Export CSV:** Downloads the final schedule as a spreadsheet containing the Date, Slot 1 RA, and Slot 2 RA.

---

## Keyboard Shortcuts

| Action | Shortcut |
| --- | --- |
| **Shortcut for Date** | `[Month Letter] + [Date]` then `Space` or `Enter` (a25 -> August 25th, s6 -> September 6th, n2[Space] -> November 2nd) |
| **Undo Last Pick** | `Ctrl + Z` (or `Cmd + Z`) |
| **Jump to RA/Duty** | `Ctrl + Click` an assigned duty checkmark in the Roster Pane to instantly make them the active picker. |

---

## Administrative Setup and Configuration

These instructions are for the ResLife RC on the Training Committee responsible for configuring the calendar. This setup must be completed to match the academic calendar before distributing the link to the RCs running duty pick for duty lines. Use the **Settings (Calendar Icon)** dropdown in the top right toolbar to configure the semester.

### 1. Set the Date Range

* Open the **Settings (Calendar Icon)** dropdown.
* Adjust the start and end dates to reflect the active duty period for the semester. The calendar will automatically generate the corresponding months.

### 2. Configure the Calendar Constraints

Inside the Settings dropdown, there are three configuration modes to align the app with the academic calendar. Click a mode to activate it, click the relevant dates on the calendar to apply the modifier, and click the "Done" button to exit the mode.

* **Exclude Days (Red):** Click days on the calendar to disable them (greyed out). Use this for academic breaks, holidays, or days where duty is covered by other staff or processes. RAs cannot select excluded days.
* **Switch Wknd/Wkdy (Purple):** By default, weekends are classified as Friday and Saturday. If the academic calendar dictates a schedule shift (e.g., a Sunday before a Monday holiday requiring weekend coverage), click the date in this mode to flip its ruleset from weekday to weekend or vice versa.
* **Clear Duty (Orange):** If a specific shift requires deletion late in the draft process, activate this mode. Click an assigned (green) triangle on the calendar to remove the assignment and return the shift to the respective RA's unassigned list.

### 4. Distribute the Link

All configurations (Date Range, Excluded Dates, Switched Dates, and Draft Order) are automatically encoded and saved in the URL.

Once setup is complete, copy the URL and distribute it to the building RCs. When an RC opens the link for their live draft, the calendar will load with all academic calendar constraints pre-configured, requiring them only to import their specific CSV roster.
