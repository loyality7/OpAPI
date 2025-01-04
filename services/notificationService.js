const Notification = require('../models/Notification');

class NotificationService {
  static async createNotification({
    recipient,
    recipientModel,
    title,
    message,
    type,
    relatedTo
  }) {
    try {
      const notification = new Notification({
        recipient,
        recipientModel,
        title,
        message,
        type,
        relatedTo
      });

      await notification.save();
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  static async createBookingNotifications(booking, type, additionalData = {}) {
    try {
      const templates = {
        BOOKING_CANCELLED: {
          user: {
            title: 'Booking Cancelled',
            message: `Your booking at ${booking.hospital.name} for ${new Date(booking.appointmentDate).toLocaleDateString()} ${booking.timeSlot} has been cancelled.`
          },
          hospital: {
            title: 'Booking Cancelled',
            message: `Booking for ${booking.patientDetails.name} on ${new Date(booking.appointmentDate).toLocaleDateString()} ${booking.timeSlot} has been cancelled.`
          }
        },
        BOOKING_CREATED: {
          user: {
            title: 'Booking Created',
            message: `Your booking with ${booking.hospital.name} has been created for ${new Date(booking.appointmentDate).toLocaleDateString()}. Token: ${booking.tokenNumber}`
          },
          hospital: {
            title: 'New Booking',
            message: `New booking received for ${new Date(booking.appointmentDate).toLocaleDateString()} from ${booking.patientDetails.name}`
          }
        },
        BOOKING_CONFIRMED: {
          user: {
            title: 'Booking Confirmed',
            message: `Your appointment at ${booking.hospital.name} is confirmed for ${new Date(booking.appointmentDate).toLocaleDateString()}`
          }
        },
        BOOKING_COMPLETED: {
          user: {
            title: 'Appointment Completed',
            message: `Your appointment at ${booking.hospital.name} has been marked as completed`
          }
        },
        PAYMENT_RECEIVED: {
          user: {
            title: 'Payment Successful',
            message: `Payment of ₹${booking.payment.amount} received for booking ${booking.tokenNumber}`
          },
          hospital: {
            title: 'Payment Received',
            message: `Payment of ₹${booking.payment.amount} received for booking ${booking.tokenNumber}`
          }
        },
        PAYMENT_FAILED: {
          user: {
            title: 'Payment Failed',
            message: `Payment failed for booking ${booking.tokenNumber}. Please try again.`
          }
        },
        APPOINTMENT_REMINDER: {
          user: {
            title: 'Appointment Reminder',
            message: `Reminder: Your appointment at ${booking.hospital.name} is tomorrow at ${booking.timeSlot}`
          }
        },
        BOOKING_REJECTED: {
          user: {
            title: 'Booking Rejected',
            message: `Your booking with ${booking.hospital.name} has been rejected. Reason: ${booking.rejectionReason || 'Not specified'}`
          }
        },
        PAYMENT_REFUNDED: {
          user: {
            title: 'Payment Refunded',
            message: `Refund of ₹${booking.payment.amount} initiated for booking ${booking.tokenNumber}`
          }
        },
        TOKEN_UPDATED: {
          user: {
            title: 'Token Number Updated',
            message: `Your token number for ${booking.hospital.name} has been updated to ${booking.tokenNumber}`
          }
        },
        DOCTOR_ASSIGNED: {
          user: {
            title: 'Doctor Assigned',
            message: `Dr. ${additionalData.doctorName} has been assigned to your appointment at ${booking.hospital.name}`
          }
        },
        PRESCRIPTION_ADDED: {
          user: {
            title: 'Prescription Added',
            message: `Your prescription for the appointment at ${booking.hospital.name} has been added`
          }
        }
      };

      const template = templates[type];
      if (!template) return null;

      const notifications = [];

      // Create user notification
      if (template.user) {
        notifications.push(
          await this.createNotification({
            recipient: booking.user,
            recipientModel: 'User',
            title: template.user.title,
            message: template.user.message,
            type,
            relatedTo: {
              model: 'Booking',
              id: booking._id
            }
          })
        );
      }

      // Create hospital notification
      if (template.hospital) {
        notifications.push(
          await this.createNotification({
            recipient: booking.hospital._id,
            recipientModel: 'Hospital',
            title: template.hospital.title,
            message: template.hospital.message,
            type,
            relatedTo: {
              model: 'Booking',
              id: booking._id
            }
          })
        );
      }

      return notifications;
    } catch (error) {
      console.error('Error creating notifications:', error);
      throw error;
    }
  }

  static async createHospitalNotification(hospital, type, data = {}) {
    const templates = {
      HOSPITAL_APPROVED: {
        title: 'Hospital Approved',
        message: 'Your hospital registration has been approved. You can now start accepting bookings.'
      },
      HOSPITAL_REJECTED: {
        title: 'Hospital Registration Rejected',
        message: `Your hospital registration was rejected. Reason: ${data.reason || 'Not specified'}`
      }
    };

    const template = templates[type];
    if (!template) return null;

    return await this.createNotification({
      recipient: hospital.createdBy,
      recipientModel: 'User',
      ...template,
      type,
      relatedTo: {
        model: 'Hospital',
        id: hospital._id
      }
    });
  }

  static async createHospitalUpdateNotification(hospital, updateType, data = {}) {
    const templates = {
      HOSPITAL_UPDATED: {
        title: 'Hospital Information Updated',
        message: 'Your hospital information has been updated successfully.'
      },
      TIMINGS_UPDATED: {
        title: 'Hospital Timings Updated',
        message: 'Your hospital operating hours have been updated.'
      },
      PRICE_UPDATED: {
        title: 'Booking Price Updated',
        message: `Booking price has been updated to ₹${data.newPrice}`
      }
    };

    const template = templates[updateType];
    if (!template) return null;

    return await this.createNotification({
      recipient: hospital.createdBy,
      recipientModel: 'User',
      ...template,
      type: 'HOSPITAL_UPDATED',
      relatedTo: {
        model: 'Hospital',
        id: hospital._id
      }
    });
  }
}

module.exports = NotificationService; 