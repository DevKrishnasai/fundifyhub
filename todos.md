todos

- submit request page
  - show minimum and maximum documents required based on category rather max count only
  - also hide the cards till at aleast 1 document is uploaded in that category
  - try to store the partially filled request in local storage so that user doesn't lose data on accidental refresh or navigation away from page with out submitting the request (documents uploaded also need to be stored temporarily)
  - use the same preview component as in request detail page to show preview of uploaded documents (reusability)
  - for pdf show correct icon instead a normal document icon

- request detail page
  - so the request shd be visible to district admin of that district only when its in pending status and once someone self assigns then no one else can see it except super admin and that assigned admin, assigned agent and the user
  - the header card showing amount, asset, created date etc in that status is also showing but it looks ugly so remove that badge like and just improve the styling a bit same like other things in that card ✅ DONE - removed status badge from header
  - in timeline sidebar show an entry when admin self assigns to handle the request (audit) ✅ DONE - added ADMIN_ASSIGNED action with UserCog icon
  - also show the texts in alert box based on who is viewing the request (admin, agent, user) ✅ DONE - implemented role-based alert texts for all statuses
  - record every event and action as audit in request history for better tracking including details like who did what and when etc
  - improve all the modal designs and make them consistent across the app
  - sockets integration for real time updates (comments, status updates etc) are not working properly fix that

- notifications
  - add notifications for each action performed on the request
  - show notification count badge on the notifications icon in header ✅ DONE - badge is properly implemented
  - notification center page to view all notifications with pagination and filters
  - fix mark as read and mark all as read not working
  - add templates for all the notifications (whatsapp, email etc)
  - send the notifications via whatsapp and email for important updates

- socket connection across the frontend 
  - connect to socket server once in the app and use that connection across the app
  - handle all the socket events in a centralized way
  - ensure if service is down nothing breaks the app

- workflow engine
  - reiterate and improve the workflow engine to make it more robust
  - add more events and actions as needed
  - make the workflow engine configurable via admin panel (later)

- cleaning up the codebase
  - remove unused code, components, services etc
  - remove backward compatibility code
  - improve code structure and organization
  - add comments and documentation where needed
  - optimize performance

- detailed request page 
  - combine continuous comments from same user into one block
  - view all activity button with modal, pagination and filters
  - improve the design of activity timeline
  - remove # usage
  - add search box for comments
  - add infinite scroll for comments
  - improve the action buttons design
  - consider removing QuickInfo or moving its content elsewhere


- remove the quick info section or move its content elsewhere as its not very useful (either move the content to header or asset details section)
- improve the design of action buttons section (it looks very cluttered currently specially on smaller screens)
- comments when we enable internal checkbox the comment should be shown only to admins and agents not to the user who raised the request but currently its visible to everyone including the user (and also the websocket will also push the comment to all users connected to that request but for internal comments it should be sent only to admins and agents)
- activity timeline should have a view all button to view all activities in a modal with pagination and filters (currently its showing only last 5 activities) 
- tooltips are not in theme sync (dark and light mode styles are not proper)
- when user upload documents in "Additional Information Required" status the documents are directly linking to the request rather when user clicks on submit Response button the documents go and link to request (by creating from the actual document model) and move the status to pending status (the uploaded documents should not directly link to the request until user submits the response) (category selection should also be there before uploading the documents same like in submit request page)
- on click of every action button a confirmation modal is coming and after confiming the model shd close and also i dont want to see loading 
- In create offer model the calculation for emi previerw is happening on the backedend which is of no use as that can be done on the frontend itself so remove that calculation from backend and do it on frontend only and also show the breakdown of emi calculation like principal amount, interest amount, processing fee etc properly in the modal. (remove #)
- offer details section design can be improved a bit its not looking very good currently some alignment and spacing issues and also can we show the emi breakdown here also like principal amount, interest amount, processing fee etc and a emi table without dates
- status changes not captured for some actions in activity timeline like when offer made , etc (need to check for all actions)
- remove the time when showing the inspection date in request details page just date is enough
- when customer requested for reschedule and the admin has option to reschedule then when i click on reschedule button it automataically moved to next status without asking for date and agent selection (the reschedule modal is not opening) (i think we need to fix these issues in inspection scheduling and rescheduling flow from all sides admin, agent and user also the frontend cards too) (all other actions related to inspection scheduling and rescheduling need to be checked properly i see some issues there like agent unavaile action etc) (reassign agent action is also not currently working need to fix that)(all these actions shd be correctly workflowed )
- when in inspection in progress status the agent need to see a card to upload the inspection photos and submit them to complete the inspection (currently agent has no option to upload inspection photos and submit them (hide the complete inspection button in the actions section and show a card to upload inspection photos with submit button when in inspection in progress status for agent users)) and also support storing them temporarily till agent submits the inspection (local storage or session storage can be used for this) if accedentely page is refreshed or navigated away from he can still have the uploaded photos (make sure after submission the photos are linked to the request properly under categoery Inspection Photos)
- from inspection to the end all the things are need to be completed (many of them are pending)



- in testing i found
   - eveything is working but not real time (all pages need to see real updated page without refresh which is happening but for some actions the data is not real time like assigning admin to request etc need to check all actions properly)
   - notifications are not coming for many actions need to check all actions properly it shd be immediate and real time and also i need to see notification count badge updating in real time also and i need banner notifications for important actions with sound alert and also in notification center page i need to see all notifications with pagination and filters and delete option for each notification and mark as read option for each notification and mark all as read option and delete all notifications option 
   - lets audit logs for every action performed on the request for better tracking who did what and when etc (need to check all actions properly)