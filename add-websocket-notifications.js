// Instructions for adding WebSocket notifications to approval system
// This file contains the code snippets to add to the backend

console.log('=== WebSocket Notification Setup Guide ===\n');

console.log('Add this code to report-approval-routes.js after successful approve:');
console.log(`
// After approval success, send WebSocket notification to requester
if (global.io) {
  global.io.emit('approval-granted', {
    userId: requester.id,
    userName: requester.name,
    approverName: currentUser.name,
    expiresAt: expiresAt,
    authorizationId: authorizationId
  });
}
`);

console.log('\nAdd this code to report-approval-routes.js after rejection:');
console.log(`
// After rejection, send WebSocket notification to requester
if (global.io) {
  global.io.emit('approval-rejected', {
    userId: requester.id,
    userName: requester.name,
    approverName: currentUser.name,
    reason: reason,
    authorizationId: authorizationId
  });
}
`);

console.log('\n=== Frontend Integration ===\n');
console.log('Add this to ReportView.tsx useEffect:');
console.log(`
useEffect(() => {
  const socket = (window as any).socket;
  if (!socket) return;

  const handleApprovalGranted = (data: any) => {
    if (data.userId === currentUser.id) {
      toast.success('您的報表查看申請已被批准！');
      checkAuthorizationStatus();
    }
  };

  const handleApprovalRejected = (data: any) => {
    if (data.userId === currentUser.id) {
      toast.error('您的報表查看申請已被拒絕：' + data.reason);
    }
  };

  socket.on('approval-granted', handleApprovalGranted);
  socket.on('approval-rejected', handleApprovalRejected);

  return () => {
    socket.off('approval-granted', handleApprovalGranted);
    socket.off('approval-rejected', handleApprovalRejected);
  };
}, [currentUser.id]);
`);

console.log('\n=== Setup Complete ===');
console.log('Note: WebSocket notifications require manual code integration');
console.log('Follow the code snippets above to add notifications');
