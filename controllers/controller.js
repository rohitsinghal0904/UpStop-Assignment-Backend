const service = require('../services/service');

exports.health = async (req, res) => {
    try {
        const data = await service.health();
        res.json(data);
    } catch (e) {
        res.status(500).json({
            error: e.message,
        });
    }
};

exports.getRooms = async (req, res) => {
    try {
        const rooms = await service.getRooms();

        res.json({ ok: true, rooms });
    } catch (e) {
        res.status(500).json({
            ok: false,
            error:
                e.message ||
                'Failed to load rooms.',
        });
    }
};
exports.bookRooms = async (
    req,
    res
) => {
    try {
        const result =
            await service.bookRooms(
                req.body
            );

        res.json(result);
    } catch (e) {
        res.status(500).json({
            error: e.message,
        });
    }
};

exports.randomOccupancy =
    async (req, res) => {
        try {
            const rooms =
                await service.randomOccupancy(
                    req.body
                );

            res.json({
                ok: true,
                rooms,
            });
        } catch (e) {
            res.status(500).json({
                error:
                    'Random occupancy failed.',
            });
        }
    };

exports.resetRooms = async (
    req,
    res
) => {
    try {
        const rooms =
            await service.resetRooms(
                req.body
            );

        res.json({
            ok: true,
            rooms,
        });
    } catch (e) {
        res.status(500).json({
            error:
                'Reset failed.',
        });
    }
};

exports.travelMatrix =
    async (req, res) => {
        try {
            const data =
                await service.travelMatrix(
                    req.body
                );

            res.json(data);
        } catch (e) {
            res.status(500).json({
                error:
                    'Travel matrix failed.',
            });
        }
    };