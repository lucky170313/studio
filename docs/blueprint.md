# **App Name**: AquaTrack

## Core Features:

- Data Input: Input fields for date, rider name, vehicle name, liters sold, rate per liter, cash received, online received, due collected, token money, staff expense, and extra amount with an optional comment.
- Total Sale Calculation: Calculates the total sale by multiplying liters sold by the rate per liter.
- Actual Received Calculation: Computes the actual money received by summing the cash and online payments.
- Adjusted Expected Calculation: Calculates the adjusted expected money by subtracting dues, tokens, staff expenses, and extra amounts from the total sale. In the calculation, a LLM tool is used to assess the reasonableness of 'extra amounts', so the tool can then suggest adding some 'extra amounts' if, for instance, sales have been unusually good on a certain day.
- Discrepancy Calculation and Status: Determines if there's a match (actual equals adjusted expected), a shortage (actual is less than adjusted expected), or an overage (actual is more than adjusted expected).
- Report Output: Displays the rider, vehicle, liters sold, total sale, actual received, adjusted expected, discrepancy, status, and any entered comment.

## Style Guidelines:

- Primary color: Light sky blue (#87CEEB) to evoke a sense of cleanliness and hydration, reflecting the nature of the water delivery business. It suggests trustworthiness.
- Background color: Very light blue (#F0F8FF) for a clean and unobtrusive backdrop that keeps focus on the sales data.
- Accent color: A slightly more saturated blue-green (#7FFFD4) is used sparingly for interactive elements like buttons and status indicators, suggesting purity.
- Clean, sans-serif font to provide clarity and easy readability of the data.
- Simple and intuitive icons for navigation and data input, providing visual cues for different categories and actions.
- A structured layout with clear sections for data input and report viewing, ensuring ease of use.
- Subtle transitions and animations to provide feedback and enhance the user experience, such as loading animations or highlighting changes in calculations.