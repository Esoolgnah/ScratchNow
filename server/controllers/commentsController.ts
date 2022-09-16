import { Request, Response } from 'express';
import { Comments } from '../models/comments';
import { Users } from '../models/users';
import { tokenAuthentication } from './authFunctions';

const commentsController = {
  createComment: async (req: Request, res: Response) => {
    const tokenValidity = tokenAuthentication(req);
    const { user_id, post_id, text, anonymity_yn, original_comment_id } =
      req.body;
    const commentValidity = await Comments.findOne({
      where: { id: original_comment_id },
    });

    if (!tokenValidity) {
      res.status(401).json({ message: 'Invalid Token' });
    } else if (original_comment_id !== null && !commentValidity) {
      res.status(400).json({
        message: `Invalid original comment id ${original_comment_id}`,
      });
    } else {
      try {
        await Comments.create({
          user_id,
          post_id,
          anonymity_yn,
          text,
          original_comment_id,
        }).then((data) => {
          res.status(201).json({ data: data, message: `Created the comment` });
        });
      } catch (err) {
        res.status(500).json({ message: 'Failed to create comment' });
      }
    }
  },

  modifyComment: async (req: Request, res: Response) => {
    const tokenValidity = tokenAuthentication(req);
    const { comment_id, text, anonymity_yn } = req.body;

    if (!tokenValidity) {
      res.status(401).json({ message: 'Invalid Token' });
    } else {
      try {
        await Comments.update(
          { text, anonymity_yn },
          { where: { id: comment_id } },
        ).then(async () => {
          const updatedCommentInfo = await Comments.findOne({
            where: { id: comment_id },
            attributes: [
              'id',
              'original_comment_id',
              'anonymity_yn',
              'updated_at',
            ],
          });
          res.status(200).json({
            data: updatedCommentInfo,
            message: `Modified the comment`,
          });
        });
      } catch (err) {
        res.status(500).json({ message: 'Failed to modify comment' });
      }
    }
  },

  deleteComment: async (req: Request, res: Response) => {
    const tokenValidity = tokenAuthentication(req);
    const { comment_id } = req.body;
    const commentValidity = await Comments.findOne({
      where: { id: comment_id },
    });

    if (!tokenValidity) {
      res.status(401).json({ message: 'Invalid Token' });
    } else if (!commentValidity) {
      res.status(404).json({ message: `No comment ${comment_id}` });
    } else {
      try {
        await Comments.destroy({ where: { id: comment_id } }).then(() => {
          res.status(200).json({ message: `Soft deleted the comment` });
        });
      } catch (err) {
        res.status(500).json({ message: 'Failed to delete the comment' });
      }
    }
  },

  getComments: async (req: Request, res: Response) => {
    const { id } = req.query;

    try {
      await Comments.findAll({
        where: { post_id: Number(id) },
        order: [
          ['created_at', 'DESC'],
          [
            { model: Comments, as: 'commentHasManyComments' },
            'created_at',
            'DESC',
          ],
        ],
        include: [
          {
            model: Users,
            as: 'userHasManyComments',
            attributes: ['id', 'nickname', 'profile_image_url'],
          },
          {
            model: Comments,
            as: 'commentHasManyComments',
            attributes: ['id', 'text', 'updated_at'],
            include: [
              {
                model: Users,
                as: 'userHasManyComments',
                attributes: ['id', 'nickname', 'profile_image_url'],
              },
            ],
          },
        ],
      }).then((data) => {
        res.status(200).json({ data: data, message: `Comments of post ${id}` });
      });
    } catch (err) {
      res.status(500).json({ message: 'Failed providing comments' });
    }
  },
};

export default commentsController;
