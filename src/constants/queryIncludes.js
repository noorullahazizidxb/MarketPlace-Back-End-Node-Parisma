// Centralised Prisma include objects — single source of truth for relation loading

export const LISTING_FULL_INCLUDE = {
  images: true,
  user: { include: { roles: true } },
  category: true,
  representatives: { include: { representative: true } },
  notifications: true,
  feedbacks: {
    include: {
      user: {
        select: { id: true, fullName: true, firstName: true, lastName: true, photo: true }
      }
    }
  }
};

export const LISTING_SUMMARY_INCLUDE = {
  images: true,
  user: { include: { roles: true } },
  category: true,
  representatives: { include: { representative: true } }
};

export const LISTING_APPROVAL_INCLUDE = {
  images: true,
  user: { include: { roles: true } },
  category: true,
  representatives: { include: { representative: true } },
  feedbacks: {
    include: {
      user: {
        select: { id: true, fullName: true, firstName: true, lastName: true, photo: true }
      }
    }
  }
};

export const BLOG_FULL_INCLUDE = {
  author: { include: { roles: true } },
  comments: {
    include: {
      author: {
        select: { id: true, fullName: true, firstName: true, lastName: true, photo: true }
      }
    }
  }
};

export const USER_WITH_ROLES_INCLUDE = {
  roles: true
};
